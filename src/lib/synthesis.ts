import type { RetrievalHit } from "./rag";

const MAX_BULLETS = 8;
const MAX_BULLETS_PER_DOCUMENT = 3;

interface EvidenceLine {
  documentTitle: string;
  text: string;
}

interface Intent {
  id: string;
  test: (query: string) => boolean;
  title: string;
  keywords: string[];
}

/**
 * Intents only decide which sentences to surface first and how to caption them.
 * They never supply content of their own, so an answer can never mention a
 * document, valve tag, or limit that is not in the retrieved evidence.
 */
const INTENTS: Intent[] = [
  {
    id: "isolation",
    test: (q) =>
      /isolat|loto|lock ?out|tag ?out/.test(q) ||
      (/open|remov/.test(q) && /casing|cover/.test(q)),
    title: "Isolation and lock-out steps recorded in the indexed procedures:",
    keywords: [
      "isolat", "loto", "v-101", "cp-2b", "mcc", "lock", "valve", "casing",
      "suction", "discharge", "permit", "drain", "vent", "bypass",
      "depressur", "blind",
    ],
  },
  {
    id: "vibration",
    test: (q) => /vibration|misalign|alignment/.test(q),
    title: "Vibration and alignment evidence across the corpus:",
    keywords: [
      "vibration", "mm/s", "alarm", "limit", "rms", "bearing", "alignment",
      "trip", "excursion",
    ],
  },
  {
    id: "seal",
    test: (q) => /seal|leak|gland|packing/.test(q),
    title: "Seal and leakage evidence from work orders, inspections, and OEM guidance:",
    keywords: [
      "seal", "leak", "flush", "drops", "deferred", "dry running", "mechanical",
      "gland", "replace",
    ],
  },
  {
    id: "temperature",
    test: (q) => /temperature|overheat|thermal|cooling/.test(q),
    title: "Temperature and cooling evidence in the indexed records:",
    keywords: [
      "temperature", "°c", "deg", "cooling", "alarm", "intercooler", "trip",
      "basin", "heat",
    ],
  },
  {
    id: "compliance",
    test: (q) =>
      /complian|audit|factory act|oisd|peso|statutory|regulat|permit|certificate/.test(q),
    title: "Regulatory and audit evidence in the indexed records:",
    keywords: [
      "factory act", "oisd", "peso", "rule", "sec 40", "permit", "certificate",
      "audit", "statutory", "logbook", "24 hour", "overdue", "calibration",
    ],
  },
];

function queryKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3);
}

function sentences(content: string): string[] {
  return content
    .split(/\n+|(?<=[.!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12);
}

/** Snap to word boundaries so excerpts never end mid-word. */
export function buildSmartExcerpt(
  content: string,
  query: string,
  maxLen = 420
): string {
  const keywords = queryKeywords(query);
  if (content.length <= maxLen) return content.trim();
  if (!keywords.length) return `${content.slice(0, maxLen).trim()}...`;

  const lower = content.toLowerCase();
  let bestStart = 0;
  let bestScore = -1;

  for (let i = 0; i < content.length; i += 30) {
    const window = lower.slice(i, i + maxLen);
    const score = keywords.reduce(
      (sum, kw) => sum + (window.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  let start = bestStart;
  let end = Math.min(content.length, bestStart + maxLen);
  if (start > 0) {
    const boundary = content.lastIndexOf(" ", start);
    start = boundary === -1 ? start : boundary + 1;
  }
  if (end < content.length) {
    const boundary = content.indexOf(" ", end);
    end = boundary === -1 ? content.length : boundary;
  }

  let excerpt = content.slice(start, end).trim();
  if (start > 0) excerpt = `...${excerpt}`;
  if (end < content.length) excerpt = `${excerpt}...`;
  return excerpt;
}

/**
 * Weights a sentence by how many intent keywords it hits, with earlier keywords
 * counting for more. Document order alone put "seal leakage requires isolation"
 * ahead of the actual isolation steps.
 */
function sentenceWeight(sentence: string, keywords: string[]): number {
  const lower = sentence.toLowerCase();
  let weight = 0;
  keywords.forEach((keyword, index) => {
    if (lower.includes(keyword)) weight += keywords.length - index;
  });
  return weight;
}

function collectEvidence(
  hits: RetrievalHit[],
  keywords: string[]
): EvidenceLine[] {
  const lines: EvidenceLine[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const ranked = sentences(hit.document.content)
      .map((text, order) => ({ text, order, weight: sentenceWeight(text, keywords) }))
      .filter((item) => item.weight > 0)
      .sort((a, b) => b.weight - a.weight || a.order - b.order)
      .slice(0, MAX_BULLETS_PER_DOCUMENT);

    for (const item of ranked) {
      const fingerprint = item.text.toLowerCase().slice(0, 60);
      if (seen.has(fingerprint)) continue;

      seen.add(fingerprint);
      lines.push({ documentTitle: hit.document.title, text: item.text });
      if (lines.length >= MAX_BULLETS) return lines;
    }
  }

  return lines;
}

function render(title: string, lines: EvidenceLine[]): string {
  const bullets = lines
    .map((line, index) => `${index + 1}. **${line.documentTitle}:** ${line.text}`)
    .join("\n");
  const sources = [...new Set(lines.map((line) => line.documentTitle))];

  return `${title}\n\n${bullets}\n\n**Sources:** ${sources.join("; ")}.`;
}

export function synthesizeFromRetrieval(
  query: string,
  hits: RetrievalHit[]
): string {
  if (!hits.length) {
    return "No indexed plant record matches that question. Try an equipment tag such as P-101 or AC-07, or upload a related SOP, work order, or inspection report on the Documents page.";
  }

  const lower = query.toLowerCase();
  const intent = INTENTS.find((candidate) => candidate.test(lower));
  const fallbackKeywords = queryKeywords(query);

  let lines = intent ? collectEvidence(hits, intent.keywords) : [];
  if (lines.length < 3) {
    const extra = collectEvidence(hits, fallbackKeywords);
    for (const line of extra) {
      if (lines.length >= MAX_BULLETS) break;
      const duplicate = lines.some(
        (existing) => existing.text.slice(0, 60) === line.text.slice(0, 60)
      );
      if (!duplicate) lines.push(line);
    }
  }

  // Last resort: lead with the opening sentence of each retrieved record rather
  // than claiming there is nothing there.
  if (!lines.length) {
    lines = hits.slice(0, 4).map((hit) => ({
      documentTitle: hit.document.title,
      text: sentences(hit.document.content)[0] ?? hit.document.content.slice(0, 240),
    }));
  }

  const title =
    intent?.title ??
    `OpsMind found ${hits.length} relevant record${hits.length === 1 ? "" : "s"} for your query:`;

  return render(title, lines.slice(0, MAX_BULLETS));
}
