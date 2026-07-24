import { NextResponse } from "next/server";
import { buildKnowledgeGraph } from "@/lib/knowledge-graph";
import { getAllDocuments } from "@/lib/rag";
import { getDashboardStats } from "@/lib/agents";

export async function GET() {
  return NextResponse.json({
    stats: getDashboardStats(),
    graph: buildKnowledgeGraph(),
    documents: getAllDocuments().map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      equipmentTags: doc.equipmentTags,
      regulatoryRefs: doc.regulatoryRefs,
      lastUpdated: doc.lastUpdated,
      preview: doc.content.slice(0, 180) + "...",
      content: doc.content,
    })),
  });
}
