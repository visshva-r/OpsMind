import { SEED_DOCUMENTS } from "./seed-documents";
import type { DocumentType, IndustrialDocument } from "./types";

const uploadedDocuments: IndustrialDocument[] = [];

const EQUIPMENT_TAG_PATTERN = /\b[A-Z]{1,3}-\d{2,4}\b/g;
const REGULATORY_PATTERN =
  /\b(?:OISD(?:-[A-Z]+-\d+)?|Factory Act Sec \d+[A-Z]?|PESO|Rule \d+|ISO \d+)\b/gi;

export function getAllStoredDocuments(): IndustrialDocument[] {
  return [...SEED_DOCUMENTS, ...uploadedDocuments];
}

export function getStoredDocumentById(id: string): IndustrialDocument | undefined {
  return getAllStoredDocuments().find((doc) => doc.id === id);
}

export function extractEquipmentTags(content: string, title: string): string[] {
  const combined = `${title} ${content}`;
  const matches = combined.match(EQUIPMENT_TAG_PATTERN) ?? [];
  return [...new Set(matches.map((tag) => tag.toUpperCase()))];
}

export function extractRegulatoryRefs(content: string): string[] {
  const matches = content.match(REGULATORY_PATTERN) ?? [];
  return [...new Set(matches.map((ref) => ref.trim()))];
}

export function inferDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();
  if (lower.includes("sop") || lower.includes("procedure")) return "Procedure";
  if (lower.includes("inspection")) return "Inspection";
  if (lower.includes("manual")) return "Manual";
  if (lower.includes("incident")) return "Incident";
  if (lower.includes("regulatory") || lower.includes("compliance")) return "Regulatory";
  if (lower.includes("work") || lower.includes("wo-")) return "Work Order";
  return "SOP";
}

export function addUploadedDocument(input: {
  filename: string;
  content: string;
  type?: DocumentType;
}): IndustrialDocument {
  const title = input.filename.replace(/\.(txt|md)$/i, "").replace(/[-_]/g, " ");
  const content = input.content.trim();

  const doc: IndustrialDocument = {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title || "Uploaded Document",
    type: input.type ?? inferDocumentType(input.filename),
    equipmentTags: extractEquipmentTags(content, title),
    regulatoryRefs: extractRegulatoryRefs(content),
    content,
    lastUpdated: new Date().toISOString().slice(0, 10),
  };

  uploadedDocuments.push(doc);
  return doc;
}

export function getUploadedDocumentCount(): number {
  return uploadedDocuments.length;
}
