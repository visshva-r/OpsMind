import { NextResponse } from "next/server";
import { runMaintenanceRca, runComplianceCheck } from "@/lib/agents";
import { sanitizeSessionDocuments } from "@/lib/document-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const agent = String(body.agent ?? "");
  const sessionDocuments = sanitizeSessionDocuments(body.sessionDocuments);
  const start = Date.now();

  if (agent === "rca") {
    const equipmentTag = String(body.equipmentTag ?? "").trim();
    const symptoms = String(body.symptoms ?? "").trim();
    if (!equipmentTag) {
      return NextResponse.json(
        { error: "equipmentTag is required" },
        { status: 400 }
      );
    }
    const result = await runMaintenanceRca({
      equipmentTag,
      symptoms: symptoms || "Reported abnormal condition",
      sessionDocuments,
    });
    return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
  }

  if (agent === "compliance") {
    const scope = String(body.scope ?? "").trim();
    if (!scope) {
      return NextResponse.json({ error: "scope is required" }, { status: 400 });
    }
    const result = await runComplianceCheck({
      scope,
      sessionDocuments,
    });
    return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
  }

  return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
}
