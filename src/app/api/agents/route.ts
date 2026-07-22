import { NextResponse } from "next/server";
import { runMaintenanceRca, runComplianceCheck } from "@/lib/agents";

export async function POST(request: Request) {
  const body = await request.json();
  const agent = String(body.agent ?? "");
  const start = Date.now();

  if (agent === "rca") {
    const result = await runMaintenanceRca({
      equipmentTag: String(body.equipmentTag ?? "P-101"),
      symptoms: String(body.symptoms ?? "High vibration and seal leakage"),
    });
    return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
  }

  if (agent === "compliance") {
    const result = await runComplianceCheck({
      scope: String(body.scope ?? "Unit-2 maintenance and safety records"),
    });
    return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
  }

  return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
}
