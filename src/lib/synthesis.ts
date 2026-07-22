import { getDocumentById } from "./rag";
import type { DocumentChunk } from "./types";

type RetrievedChunk = { chunk: DocumentChunk; score: number };

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function buildSmartExcerpt(
  content: string,
  query: string,
  maxLen = 320
): string {
  const keywords = tokenize(query);
  if (!keywords.length) {
    return content.length > maxLen ? `${content.slice(0, maxLen)}...` : content;
  }

  const lower = content.toLowerCase();
  let bestStart = 0;
  let bestScore = -1;

  for (let i = 0; i < content.length; i += 40) {
    const window = lower.slice(i, i + maxLen);
    const score = keywords.reduce(
      (sum, kw) => sum + (window.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  let excerpt = content.slice(bestStart, bestStart + maxLen).trim();
  if (bestStart > 0) excerpt = `...${excerpt}`;
  if (bestStart + maxLen < content.length) excerpt = `${excerpt}...`;
  return excerpt;
}

function extractMatchingLines(content: string, keywords: string[]): string[] {
  const parts = content.split(/\n|(?<=[.!])\s+/);
  return parts
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 10 &&
        keywords.some((kw) => p.toLowerCase().includes(kw))
    )
    .slice(0, 6);
}

function formatBullets(title: string, lines: string[], sources: string[]): string {
  const bullets = lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
  return `${title}\n\n${bullets}\n\n**Sources:** ${sources.join("; ")}.`;
}

export function synthesizeFromRetrieval(
  query: string,
  retrieved: RetrievedChunk[]
): string {
  const lower = query.toLowerCase();
  const sop = getDocumentById("doc-sop-p101");
  const pid = getDocumentById("doc-pid-excerpt");
  const inspection = getDocumentById("doc-inspection-p101");
  const manual = getDocumentById("doc-manual-p101");
  const wo = getDocumentById("doc-wo-p101");
  const factoryAct = getDocumentById("doc-factory-act");
  const oisd = getDocumentById("doc-oistd-safety");
  const nearMiss = getDocumentById("doc-nearmiss-cs");

  if (
    lower.includes("isolation") ||
    lower.includes("loto") ||
    (lower.includes("opening") && lower.includes("casing"))
  ) {
    return formatBullets(
      "Isolation procedure for Pump P-101 before opening the casing:",
      [
        "**Close suction valve V-101A** and **discharge valve V-101B** before any maintenance (P&ID + SOP).",
        "**Apply LOTO on MCC panel CP-2B** before opening the pump casing (Preventive Maintenance SOP).",
        "Verify P-101 suction from CT-02 basin via strainer ST-101; discharge routes to exchangers E-201 and E-202.",
        "Confirm check valve **CV-101** prevents backflow on the shared header with P-102.",
        "If P-102 is under maintenance in parallel, ensure bypass line **BL-101** is open per P&ID guidance.",
        "**Safety gate:** Seal leakage above 5 drops/min requires immediate isolation and a maintenance work order.",
      ],
      [sop?.title ?? "SOP", pid?.title ?? "P&ID"].filter(Boolean)
    );
  }

  if (
    lower.includes("vibration") &&
    (lower.includes("limit") ||
      lower.includes("status") ||
      lower.includes("current"))
  ) {
    return formatBullets(
      "Vibration limits and current status for Pump P-101:",
      [
        "**OEM / SOP limit:** Vibration velocity must not exceed **7.1 mm/s RMS** (OISD-GDN-118 aligned).",
        "**Current inspection reading:** **8.4 mm/s** on drive-end bearing — **above limit** (Dec 2025 inspection).",
        "**Historical context:** Prior bearing replacement at **9.2 mm/s** with misalignment suspected (WO-24156).",
        "**OISD requirement:** Any alarm excursion requires documented investigation within **24 hours**.",
        "**Recommended action:** Raise priority work order, perform alignment check, and replace seal if leakage persists.",
      ],
      [
        sop?.title ?? "SOP",
        inspection?.title ?? "Inspection",
        oisd?.title ?? "OISD",
      ]
    );
  }

  if (
    lower.includes("seal") &&
    (lower.includes("fail") ||
      lower.includes("why") ||
      lower.includes("repeat"))
  ) {
    return formatBullets(
      "Why Pump P-101 is experiencing repeat seal failures:",
      [
        "**Deferred permanent fix:** WO-24288 applied temporary seal leak arrest; permanent seal change was deferred.",
        "**Vibration excursions:** Inspection shows 8.4 mm/s (limit 7.1 mm/s); post-maintenance misalignment has recurred.",
        "**Temperature events:** WO-24091 replaced seal after temperature rose to 82°C — indicates seal face wear.",
        "**OEM failure mode:** Dry running >90 seconds damages seal faces; verify minimum flow 180 m3/h from CT-02.",
        "**Systemic gap:** Repeat failures within 12 months should trigger formal RCA and reliability board review.",
      ],
      [wo?.title ?? "Work Orders", inspection?.title ?? "Inspection", manual?.title ?? "OEM Manual"]
    );
  }

  if (lower.includes("compliance") || lower.includes("audit")) {
    return formatBullets(
      "Compliance gaps before the next Factory Act / OISD audit:",
      [
        "**Factory Act Sec 40B:** Maintenance logbook entries and signed inspection evidence required for critical machinery.",
        "**OISD-GDN-118:** Vibration alarm on P-101 lacks documented 24-hour investigation closure.",
        "**Permit-to-work:** Near-miss on V-220 shows permit was not revalidated after process upset; gas detector calibration overdue.",
        "**Rule 68:** Work permit system mandatory for hazardous-area maintenance — audit trail must include gas test sheets.",
        "**Before audit:** Close overdue inspections, attach RCA for repeat P-101 failures, refresh permit revalidation workflow.",
      ],
      [
        factoryAct?.title ?? "Factory Act",
        oisd?.title ?? "OISD",
        nearMiss?.title ?? "Near Miss Report",
      ]
    );
  }

  const keywords = tokenize(query);
  const lines: string[] = [];

  for (const { chunk } of retrieved) {
    const matches = extractMatchingLines(chunk.content, keywords);
    for (const match of matches) {
      if (!lines.some((l) => l.includes(match.slice(0, 40)))) {
        lines.push(`**${chunk.documentTitle}:** ${match}`);
      }
    }
    if (lines.length >= 5) break;
  }

  if (lines.length === 0) {
    for (const { chunk } of retrieved.slice(0, 4)) {
      const sentence =
        chunk.content.split(/(?<=[.!])\s+/)[0] ?? chunk.content.slice(0, 200);
      lines.push(`**${chunk.documentTitle}:** ${sentence}`);
    }
  }

  return formatBullets(
    `OpsMind found ${retrieved.length} relevant knowledge sources for your query:`,
    lines.slice(0, 5),
    retrieved.slice(0, 3).map((r) => r.chunk.documentTitle)
  );
}
