import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/agents";
import { sanitizeSessionDocuments } from "@/lib/document-store";
import { buildKnowledgeGraph } from "@/lib/knowledge-graph";
import { getAllDocuments } from "@/lib/rag";

function payload(sessionDocuments = sanitizeSessionDocuments([])) {
  return {
    stats: getDashboardStats(sessionDocuments),
    graph: buildKnowledgeGraph(sessionDocuments),
    documents: getAllDocuments(sessionDocuments).map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      equipmentTags: doc.equipmentTags,
      regulatoryRefs: doc.regulatoryRefs,
      lastUpdated: doc.lastUpdated,
      preview: `${doc.content.slice(0, 180)}...`,
      content: doc.content,
    })),
  };
}

export async function GET() {
  return NextResponse.json(payload());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    payload(sanitizeSessionDocuments(body.sessionDocuments))
  );
}
