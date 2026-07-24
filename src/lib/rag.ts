import { getAllStoredDocuments, getStoredDocumentById } from "./document-store";
import type { DocumentChunk, IndustrialDocument } from "./types";

const CHUNK_SIZE = 320;
const CHUNK_OVERLAP = 60;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function chunkDocument(doc: IndustrialDocument): DocumentChunk[] {
  const words = doc.content.split(/\s+/);
  const chunks: DocumentChunk[] = [];
  let index = 0;
  let chunkIndex = 0;

  while (index < words.length) {
    const slice = words.slice(index, index + CHUNK_SIZE);
    const content = slice.join(" ");
    chunks.push({
      id: `${doc.id}-chunk-${chunkIndex}`,
      documentId: doc.id,
      documentTitle: doc.title,
      documentType: doc.type,
      equipmentTags: doc.equipmentTags,
      regulatoryRefs: doc.regulatoryRefs,
      content,
      chunkIndex,
    });
    index += CHUNK_SIZE - CHUNK_OVERLAP;
    chunkIndex += 1;
  }

  return chunks;
}

let cachedChunks: DocumentChunk[] | null = null;
let cachedDocumentCount = 0;

export function invalidateChunkCache() {
  cachedChunks = null;
  cachedDocumentCount = 0;
}

export function getAllDocuments(): IndustrialDocument[] {
  return getAllStoredDocuments();
}

export function getDocumentById(id: string): IndustrialDocument | undefined {
  return getStoredDocumentById(id);
}

export function getAllChunks(): DocumentChunk[] {
  const documents = getAllStoredDocuments();
  if (!cachedChunks || cachedDocumentCount !== documents.length) {
    cachedChunks = documents.flatMap(chunkDocument);
    cachedDocumentCount = documents.length;
  }
  return cachedChunks;
}

export function scoreChunk(chunk: DocumentChunk, queryTokens: string[]): number {
  const chunkTokens = new Set(tokenize(chunk.content));
  const titleTokens = tokenize(chunk.documentTitle);
  const tagTokens = chunk.equipmentTags.map((tag) => tag.toLowerCase());
  const regTokens = chunk.regulatoryRefs.map((ref) => ref.toLowerCase());

  let score = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) score += 2;
    if (titleTokens.includes(token)) score += 4;
    if (tagTokens.some((tag) => tag.includes(token))) score += 5;
    if (regTokens.some((ref) => ref.includes(token))) score += 4;
  }

  return score;
}

export function retrieveRelevantChunks(query: string, limit = 5) {
  const queryTokens = tokenize(query);
  const chunks = getAllChunks()
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryTokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (chunks.length === 0) {
    return getAllChunks()
      .slice(0, limit)
      .map((chunk) => ({ chunk, score: 0.2 }));
  }

  const maxScore = chunks[0]?.score || 1;
  return chunks.map((item) => ({
    chunk: item.chunk,
    score: Math.min(0.98, 0.45 + item.score / maxScore / 2),
  }));
}
