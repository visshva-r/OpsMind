import { getAllStoredDocuments, getStoredDocumentById } from "./document-store";
import type { DocumentChunk, IndustrialDocument } from "./types";

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "was", "with", "this", "that", "from", "into",
  "your", "what", "when", "where", "which", "have", "has", "been", "not",
  "but", "any", "all", "can", "does", "before", "after", "next", "about",
  "should", "would", "could", "there", "their", "than", "then", "them",
  "how", "why", "who", "get", "our", "its", "was", "were", "you",
]);

const TAG_PATTERN = /\b[a-z]{1,3}-\d{2,4}[a-z]?\b/gi;

/**
 * Relevance below this is treated as "no usable evidence" rather than being shown
 * as a weak citation. A retriever that always returns something is a retriever
 * that lies on out-of-corpus questions.
 */
const MIN_RELEVANCE = 0.3;

/** Raw score at which the saturating component of relevance reaches 0.5. */
const SCORE_MIDPOINT = 14;

export interface RetrievalHit {
  chunk: DocumentChunk;
  document: IndustrialDocument;
  /** Absolute 0-1 relevance. Not a rank artifact: a weak match stays weak. */
  score: number;
  /** Fraction of distinct query terms present in the source document. */
  coverage: number;
}

interface QueryTerms {
  tokens: string[];
  tags: Set<string>;
  phrases: string[];
  /** The question is asking "how do I do X", so procedural records rank higher. */
  procedural: boolean;
}

export function analyzeQuery(query: string): QueryTerms {
  const tags = new Set(
    (query.match(TAG_PATTERN) ?? []).map((tag) => tag.toLowerCase())
  );

  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  const phrases = query
    .toLowerCase()
    .split(/[?.,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12);

  return {
    tokens: [...new Set([...tags, ...words])],
    tags,
    phrases,
    procedural: /isolat|loto|procedure|step|startup|checklist|permit/.test(
      query.toLowerCase()
    ),
  };
}

function chunkDocument(doc: IndustrialDocument): DocumentChunk[] {
  const base = {
    documentId: doc.id,
    documentTitle: doc.title,
    documentType: doc.type,
    equipmentTags: doc.equipmentTags,
    regulatoryRefs: doc.regulatoryRefs,
  };

  const chunks: DocumentChunk[] = [
    { ...base, id: `${doc.id}-full`, content: doc.content, chunkIndex: 0 },
  ];

  const words = doc.content.split(/\s+/).filter(Boolean);
  if (words.length <= 220) return chunks;

  // Split on numbered steps or "Heading:" lines, which is how these plant
  // records are actually structured.
  const sections = doc.content
    .split(/\n(?=\d+\.|[A-Z][A-Za-z0-9 /&-]{2,40}:)/)
    .map((section) => section.trim())
    .filter((section) => section.length > 40);

  if (sections.length < 2) return chunks;

  sections.forEach((section, index) => {
    chunks.push({
      ...base,
      id: `${doc.id}-section-${index}`,
      content: section,
      chunkIndex: index + 1,
    });
  });

  return chunks;
}

/** IDF is a corpus-level property, so compute it once per query, not per chunk. */
function buildIdf(tokens: string[], chunks: DocumentChunk[]): Map<string, number> {
  const lowered = chunks.map((chunk) => chunk.content.toLowerCase());
  const idf = new Map<string, number>();

  for (const token of tokens) {
    const df = lowered.reduce(
      (count, content) => count + (content.includes(token) ? 1 : 0),
      0
    );
    idf.set(token, Math.log(1 + chunks.length / (1 + df)));
  }

  return idf;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function scoreChunk(
  chunk: DocumentChunk,
  terms: QueryTerms,
  idf: Map<string, number>
): number {
  const contentLower = chunk.content.toLowerCase();
  const titleLower = chunk.documentTitle.toLowerCase();
  let score = 0;

  for (const token of terms.tokens) {
    const tf = countOccurrences(contentLower, token);
    if (tf > 0) score += (1 + Math.log(1 + tf)) * (idf.get(token) ?? 1);
    if (titleLower.includes(token)) score += 3.5;
    if (chunk.equipmentTags.some((tag) => tag.toLowerCase() === token)) score += 5;
    if (chunk.regulatoryRefs.some((ref) => ref.toLowerCase().includes(token))) {
      score += 4;
    }
  }

  for (const phrase of terms.phrases) {
    if (contentLower.includes(phrase)) score += 6;
  }

  if (chunk.chunkIndex === 0) score += 0.8;

  if (terms.procedural && ["SOP", "Procedure", "Manual"].includes(chunk.documentType)) {
    score += 2.5;
  }

  return score;
}

function documentCoverage(doc: IndustrialDocument, tokens: string[]): number {
  if (!tokens.length) return 0;
  const haystack = `${doc.title} ${doc.content} ${doc.equipmentTags.join(
    " "
  )} ${doc.regulatoryRefs.join(" ")}`.toLowerCase();
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  return matched / tokens.length;
}

export function getAllDocuments(
  sessionDocuments: IndustrialDocument[] = []
): IndustrialDocument[] {
  return getAllStoredDocuments(sessionDocuments);
}

export function getDocumentById(
  id: string,
  sessionDocuments: IndustrialDocument[] = []
): IndustrialDocument | undefined {
  return getStoredDocumentById(id, sessionDocuments);
}

/**
 * Returns at most one hit per document. Previously the full-document chunk and
 * its section chunks could both surface, which produced citation lists with the
 * same source repeated three times.
 */
export function retrieveRelevantChunks(
  query: string,
  limit = 6,
  sessionDocuments: IndustrialDocument[] = []
): RetrievalHit[] {
  const terms = analyzeQuery(query);
  if (!terms.tokens.length) return [];

  const documents = getAllStoredDocuments(sessionDocuments);
  const documentsById = new Map(documents.map((doc) => [doc.id, doc]));
  const chunks = documents.flatMap(chunkDocument);
  const idf = buildIdf(terms.tokens, chunks);

  const bestPerDocument = new Map<string, { chunk: DocumentChunk; raw: number }>();
  for (const chunk of chunks) {
    const raw = scoreChunk(chunk, terms, idf);
    if (raw <= 0) continue;
    const current = bestPerDocument.get(chunk.documentId);
    if (!current || raw > current.raw) {
      bestPerDocument.set(chunk.documentId, { chunk, raw });
    }
  }

  const hits: RetrievalHit[] = [];
  for (const { chunk, raw } of bestPerDocument.values()) {
    const document = documentsById.get(chunk.documentId);
    if (!document) continue;

    const coverage = documentCoverage(document, terms.tokens);
    const saturated = raw / (raw + SCORE_MIDPOINT);
    const score = Number((0.45 * coverage + 0.55 * saturated).toFixed(2));
    if (score < MIN_RELEVANCE) continue;

    hits.push({ chunk, document, score, coverage: Number(coverage.toFixed(2)) });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
