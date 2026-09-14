import { loadSessionDocuments } from "./client-store";
import type { DashboardStats, IndustrialDocument } from "./types";

export interface CorpusResponse {
  stats: DashboardStats;
  graph: {
    nodes: Array<{ id: string; label: string; type: string; assetTag?: boolean }>;
    edges: Array<{
      id: string;
      from: string;
      to: string;
      relation: string;
      source?: string;
      meaning?: string;
    }>;
  };
  documents: IndustrialDocument[];
}

const EMPTY: CorpusResponse = {
  stats: { documentsIndexed: 0, assetTags: 0, complianceRules: 0, graphEdges: 0 },
  graph: { nodes: [], edges: [] },
  documents: [],
};

/**
 * Always resolves. Callers render loading state off this promise, so a rejected
 * fetch would leave the page stuck on its spinner forever.
 */
export async function fetchCorpus(
  sessionDocuments?: IndustrialDocument[]
): Promise<CorpusResponse> {
  const docs = sessionDocuments ?? loadSessionDocuments();

  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionDocuments: docs }),
    });
    if (!response.ok) return EMPTY;
    return (await response.json()) as CorpusResponse;
  } catch {
    return EMPTY;
  }
}

export function withSessionDocuments<T extends Record<string, unknown>>(
  body: T
): T & { sessionDocuments: IndustrialDocument[] } {
  return { ...body, sessionDocuments: loadSessionDocuments() };
}
