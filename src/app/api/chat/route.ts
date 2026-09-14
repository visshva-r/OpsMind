import { NextResponse } from "next/server";
import { answerWithRag } from "@/lib/agents";
import { sanitizeSessionDocuments } from "@/lib/document-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const query = String(body.query ?? "").trim();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const start = Date.now();
  const result = await answerWithRag(query, {
    useGemini: Boolean(body.useGemini),
    sessionDocuments: sanitizeSessionDocuments(body.sessionDocuments),
  });

  return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
}
