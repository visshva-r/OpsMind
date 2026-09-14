import type { IndustrialDocument } from "./types";

const STORAGE_KEY = "opsmind-session-docs-v1";

/**
 * Every API call replays the session corpus in its request body, so the cap is a
 * payload budget as much as a storage one: 10 x 80KB stays well inside the 4.5MB
 * serverless request limit. Content is trimmed to the same length the server
 * accepts, so nothing is sent that would only be truncated on arrival.
 */
const MAX_DOCUMENTS = 10;
const MAX_CONTENT_LENGTH = 80_000;

export function loadSessionDocuments(): IndustrialDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IndustrialDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(documents: IndustrialDocument[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    return true;
  } catch {
    return false;
  }
}

export function saveSessionDocument(doc: IndustrialDocument): boolean {
  if (typeof window === "undefined") return false;

  const trimmed: IndustrialDocument = {
    ...doc,
    content: doc.content.slice(0, MAX_CONTENT_LENGTH),
  };
  let queue = [
    trimmed,
    ...loadSessionDocuments().filter((item) => item.id !== doc.id),
  ].slice(0, MAX_DOCUMENTS);

  // Drop the oldest entries until it fits rather than losing the new upload.
  while (queue.length > 0) {
    if (persist(queue)) return true;
    queue = queue.slice(0, queue.length - 1);
  }

  return false;
}

export function clearSessionDocuments() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
