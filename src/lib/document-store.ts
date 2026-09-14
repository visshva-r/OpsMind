import { SEED_DOCUMENTS } from "./seed-documents";
import type { DocumentType, IndustrialDocument } from "./types";

const EQUIPMENT_TAG_PATTERN = /\b[A-Z]{1,3}-\d{2,4}[A-Z]?\b/g;
const REGULATORY_PATTERN =
  /\b(?:OISD(?:-[A-Z]+-\d+)?|Factory Act(?: Sec \d+[A-Z]?| Rule \d+)?|PESO|Rule \d+|ISO \d+)\b/gi;

const DOCUMENT_TYPES: DocumentType[] = [
  "SOP",
  "Work Order",
  "Inspection",
  "Regulatory",
  "Manual",
  "Incident",
  "Procedure",
];

/** Tags that are real asset identifiers (P-101) rather than free-text descriptors. */
export function isAssetTag(tag: string): boolean {
  return /^[A-Z]{1,3}-\d{2,4}[A-Z]?$/.test(tag.toUpperCase());
}

/**
 * Isolation valves (V-101A) and MCC panels (CP-2B) are fixtures on an asset,
 * not failure hosts. Vessels such as V-220 stay eligible.
 */
export function isFailureHostTag(tag: string): boolean {
  if (!isAssetTag(tag)) return false;
  const upper = tag.toUpperCase();
  if (/^CV-\d/.test(upper) || /^CP-\d/.test(upper)) return false;
  if (/^V-\d+[A-Z]$/.test(upper)) return false;
  return true;
}

function isDocumentType(value: unknown): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType);
}

export function isValidDocument(value: unknown): value is IndustrialDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as IndustrialDocument;
  return (
    typeof doc.id === "string" &&
    doc.id.length > 0 &&
    typeof doc.title === "string" &&
    typeof doc.content === "string" &&
    doc.content.trim().length > 0 &&
    Array.isArray(doc.equipmentTags) &&
    Array.isArray(doc.regulatoryRefs)
  );
}

/**
 * Session documents arrive from the browser, so everything is untrusted: cap the
 * count and field sizes, force a known DocumentType, and namespace the ids so a
 * client cannot shadow or impersonate a seed document.
 */
export function sanitizeSessionDocuments(input: unknown): IndustrialDocument[] {
  if (!Array.isArray(input)) return [];
  const seedIds = new Set(SEED_DOCUMENTS.map((doc) => doc.id));
  const seen = new Set<string>();
  const docs: IndustrialDocument[] = [];

  for (const item of input.slice(0, 20)) {
    if (!isValidDocument(item)) continue;

    const id = item.id.slice(0, 80);
    if (seedIds.has(id) || seen.has(id) || !id.startsWith("upload-")) continue;
    seen.add(id);

    docs.push({
      id,
      title: item.title.slice(0, 200) || "Uploaded Document",
      type: isDocumentType(item.type) ? item.type : "SOP",
      equipmentTags: item.equipmentTags.slice(0, 20).map((tag) => String(tag).slice(0, 40)),
      regulatoryRefs: item.regulatoryRefs.slice(0, 20).map((ref) => String(ref).slice(0, 60)),
      content: item.content.slice(0, 80_000),
      lastUpdated: item.lastUpdated || new Date().toISOString().slice(0, 10),
    });
  }

  return docs;
}

/**
 * The corpus is the immutable seed set plus whatever the caller's browser session
 * supplied. Nothing is cached server-side: on a serverless host each request may
 * hit a different instance, and a module-level store would also leak one visitor's
 * uploads into another visitor's results.
 */
export function getAllStoredDocuments(
  sessionDocuments: IndustrialDocument[] = []
): IndustrialDocument[] {
  return [...SEED_DOCUMENTS, ...sanitizeSessionDocuments(sessionDocuments)];
}

export function getStoredDocumentById(
  id: string,
  sessionDocuments: IndustrialDocument[] = []
): IndustrialDocument | undefined {
  return getAllStoredDocuments(sessionDocuments).find((doc) => doc.id === id);
}

export function extractRegulatoryRefs(content: string): string[] {
  const matches = content.match(REGULATORY_PATTERN) ?? [];
  return [...new Set(matches.map((ref) => ref.trim()))];
}

export function extractEquipmentTags(content: string, title: string): string[] {
  const combined = `${title}\n${content}`;
  const regulatoryRefs = extractRegulatoryRefs(combined).map((ref) =>
    ref.toUpperCase()
  );
  const matches = combined.match(EQUIPMENT_TAG_PATTERN) ?? [];
  const tags = [...new Set(matches.map((tag) => tag.toUpperCase()))];

  // "OISD-GDN-118" would otherwise register "GDN-118" as an asset tag.
  return tags.filter(
    (tag) => !regulatoryRefs.some((ref) => ref !== tag && ref.includes(tag))
  );
}

export function inferDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();
  if (lower.includes("sop")) return "SOP";
  if (lower.includes("procedure") || lower.includes("permit")) return "Procedure";
  if (lower.includes("inspection") || lower.includes("checklist")) return "Inspection";
  if (lower.includes("manual")) return "Manual";
  if (
    lower.includes("incident") ||
    lower.includes("near") ||
    lower.includes("miss")
  ) {
    return "Incident";
  }
  if (
    lower.includes("regulat") ||
    lower.includes("compliance") ||
    lower.includes("oisd") ||
    lower.includes("audit")
  ) {
    return "Regulatory";
  }
  if (lower.includes("work") || lower.includes("wo-")) return "Work Order";
  return "SOP";
}

/**
 * Normalises an upload into plain prose. CSV rows become `header: value` lines so
 * the sentence-level retriever can match them; JSON is flattened the same way.
 */
export function parseUploadedContent(filename: string, raw: string): string {
  const lower = filename.toLowerCase();
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === "string") return parsed;
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        "content" in parsed &&
        typeof (parsed as { content: unknown }).content === "string"
      ) {
        return (parsed as { content: string }).content;
      }
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.map((row) => flattenRecord(row)).join("\n\n");
    } catch {
      return trimmed;
    }
  }

  if (lower.endsWith(".csv")) return csvToProse(trimmed);

  return trimmed;
}

function flattenRecord(value: unknown): string {
  if (value === null || typeof value !== "object") return String(value);
  return Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => `${humanizeKey(key)}: ${
      val !== null && typeof val === "object" ? JSON.stringify(val) : String(val)
    }`)
    .join("\n");
}

function humanizeKey(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function csvToProse(raw: string): string {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return raw;

  const headers = splitCsvLine(lines[0]).map(humanizeKey);
  return lines
    .slice(1)
    .map((line, index) => {
      const cells = splitCsvLine(line);
      const body = headers
        .map((header, i) => (cells[i] ? `${header}: ${cells[i]}` : ""))
        .filter(Boolean)
        .join("; ");
      return `Row ${index + 1}. ${body}`;
    })
    .join("\n");
}

export function buildDocumentFromUpload(input: {
  filename: string;
  content: string;
  type?: DocumentType;
}): IndustrialDocument {
  const title = input.filename
    .replace(/\.(txt|md|csv|json)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const content = parseUploadedContent(input.filename, input.content);

  return {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title || "Uploaded Document",
    type: input.type ?? inferDocumentType(input.filename),
    equipmentTags: extractEquipmentTags(content, title),
    regulatoryRefs: extractRegulatoryRefs(content),
    content,
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}
