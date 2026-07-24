import { NextResponse } from "next/server";
import { answerWithRag, recordQueryTime } from "@/lib/agents";

export async function POST(request: Request) {
  const body = await request.json();
  const query = String(body.query ?? "").trim();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const start = Date.now();
  const result = await answerWithRag(query);
  const elapsedMs = Date.now() - start;
  recordQueryTime(elapsedMs);

  return NextResponse.json({ ...result, elapsedMs });
}
