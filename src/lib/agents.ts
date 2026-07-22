import { retrieveRelevantChunks } from "./rag";
import { buildSmartExcerpt, synthesizeFromRetrieval } from "./synthesis";
import type { AgentAction, AgentResult, Citation, KnowledgeLink } from "./types";

function toCitations(
  results: ReturnType<typeof retrieveRelevantChunks>,
  query: string
): Citation[] {
  return results.map(({ chunk, score }) => ({
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentType: chunk.documentType,
    excerpt: buildSmartExcerpt(chunk.content, query),
    relevanceScore: Number(score.toFixed(2)),
  }));
}

function citationBlob(citations: Citation[]): string {
  return citations
    .map((c) => `${c.documentTitle} ${c.excerpt}`.toLowerCase())
    .join(" ");
}

function buildKnowledgeLinks(
  citations: Citation[],
  equipmentTag = "P-101"
): KnowledgeLink[] {
  const text = citationBlob(citations);
  const tag = equipmentTag.toUpperCase();
  const links: KnowledgeLink[] = [];

  if (text.includes("seal") || text.includes("leak")) {
    links.push({
      from: tag,
      relation: "has_recurring_failure",
      to: "Mechanical Seal",
      source:
        citations.find((c) => c.excerpt.toLowerCase().includes("seal"))
          ?.documentTitle ?? "Work Order History",
    });
  }

  if (text.includes("vibration")) {
    links.push({
      from: tag,
      relation: "exceeds_limit",
      to: "Vibration Threshold (7.1 mm/s)",
      source:
        citations.find((c) => c.excerpt.toLowerCase().includes("vibration"))
          ?.documentTitle ?? "Inspection Report",
    });
  }

  if (text.includes("oisd") || text.includes("factory act")) {
    links.push({
      from: tag,
      relation: "requires",
      to: "Regulatory Investigation",
      source:
        citations.find((c) =>
          c.documentTitle.toLowerCase().includes("oisd")
        )?.documentTitle ?? "OISD Guidelines",
    });
  }

  if (text.includes("temperature") || text.includes("108")) {
    links.push({
      from: tag,
      relation: "trending_high",
      to: "Discharge Temperature (110°C alarm)",
      source:
        citations.find((c) => c.excerpt.toLowerCase().includes("temperature"))
          ?.documentTitle ?? "Inspection Report",
    });
  }

  if (text.includes("peso") || text.includes("safety valve")) {
    links.push({
      from: tag,
      relation: "approaching_expiry",
      to: "PESO Safety Valve Certificate",
      source:
        citations.find((c) => c.documentTitle.includes("AC-07"))
          ?.documentTitle ?? "Inspection Report",
    });
  }

  if (text.includes("permit") || text.includes("confined space")) {
    links.push({
      from: "V-220",
      relation: "violates",
      to: "Permit Revalidation Rule",
      source: "Permit-to-Work Procedure",
    });
  }

  return links;
}

async function maybeCallGemini(
  prompt: string,
  fullContext: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${prompt}\n\nUse numbered steps where appropriate. Cite document titles inline.\n\nContext:\n${fullContext}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function answerWithRag(query: string) {
  const retrieved = retrieveRelevantChunks(query, 6);
  const citations = toCitations(retrieved, query);
  const confidence =
    citations.length > 0
      ? Number(
          (
            citations.reduce((sum, c) => sum + c.relevanceScore, 0) /
            citations.length
          ).toFixed(2)
        )
      : 0.4;

  const fullContext = retrieved
    .map(
      (r, i) =>
        `[${i + 1}] ${r.chunk.documentTitle} (${r.chunk.documentType}):\n${r.chunk.content}`
    )
    .join("\n\n");

  const geminiAnswer = await maybeCallGemini(
    `You are OpsMind, an industrial knowledge copilot. Answer thoroughly using ONLY the context below.\n\nQuestion: ${query}`,
    fullContext
  );

  const answer =
    geminiAnswer ?? synthesizeFromRetrieval(query, retrieved);

  return { answer, citations, confidence };
}

function buildRcaSummary(
  equipmentTag: string,
  symptoms: string,
  citations: Citation[]
): string {
  const tag = equipmentTag.toUpperCase();
  const combined = `${symptoms} ${citationBlob(citations)}`.toLowerCase();

  if (tag.includes("AC-07") || combined.includes("compressor")) {
    return `Analysis for ${tag} indicates discharge temperature trending toward alarm threshold (108°C vs 110°C limit), overdue intercooler drain maintenance, and an approaching PESO safety valve certificate expiry — creating combined reliability and compliance risk.`;
  }

  if (tag.includes("B-401") || combined.includes("boiler")) {
    return `Analysis for ${tag} recommends formal RCA using the boiler trip template: timeline reconstruction from DCS logs, work orders, and operator records, with escalation to the site reliability board if repeat failures occur within 90 days.`;
  }

  return `Repeat failures on ${tag} are driven by deferred seal replacement, alignment gaps after maintenance, and insufficient follow-up on vibration excursions (${symptoms}).`;
}

function buildRcaActions(
  equipmentTag: string,
  symptoms: string,
  citations: Citation[]
): AgentAction[] {
  const tag = equipmentTag.toUpperCase();
  const combined = `${symptoms} ${citationBlob(citations)}`.toLowerCase();

  if (tag.includes("AC-07") || combined.includes("compressor")) {
    return [
      {
        priority: "critical",
        title: "Investigate discharge temperature trend before alarm",
        description:
          "Discharge temperature at 108°C is approaching the 110°C alarm. Inspect cooling, lubrication, and load conditions immediately.",
        owner: "Utilities Team",
        dueIn: "24 hours",
        citations: citations.slice(0, 2),
      },
      {
        priority: "high",
        title: "Restore intercooler drain schedule",
        description:
          "Drain interval exceeded by 9 days — moisture carryover risk. Resume schedule and log completion.",
        owner: "Maintenance Planner",
        dueIn: "48 hours",
        citations: citations.slice(1, 3),
      },
      {
        priority: "high",
        title: "Renew PESO safety valve certificate",
        description:
          "Certificate expires in 22 days. Schedule PESO-approved test before expiry.",
        owner: "Safety Team",
        dueIn: "15 days",
        citations: citations.filter((c) => c.documentTitle.includes("AC-07")),
      },
    ];
  }

  return [
    {
      priority: "critical",
      title: `Replace mechanical seal on ${tag} and verify flush plan`,
      description:
        "Seal leakage and temperature excursions indicate seal face damage. Replace using OEM kit and confirm seal flush flow >= 2.5 m3/h.",
      owner: "Rotating Equipment Team",
      dueIn: "48 hours",
      citations: citations.slice(0, 2),
    },
    {
      priority: "high",
      title: "Perform laser alignment to OEM tolerance",
      description:
        "Post-maintenance vibration spikes suggest misalignment. Target <= 0.05 mm offset per OEM manual.",
      owner: "Maintenance Engineering",
      dueIn: "72 hours",
      citations: citations.slice(1, 3),
    },
    {
      priority: "high",
      title: "Close overdue lubrication and inspection gaps",
      description:
        "Restore monthly lubrication schedule and upload signed inspection checklist.",
      owner: "Maintenance Planner",
      dueIn: "7 days",
      citations: citations.slice(2, 4),
    },
    {
      priority: "medium",
      title: "Conduct formal RCA and reliability board review",
      description:
        "Repeat failures within 12 months trigger escalation per RCA template.",
      owner: "Site Reliability Lead",
      dueIn: "14 days",
      citations: citations.slice(0, 1),
    },
  ];
}

function buildComplianceSummary(scope: string, citations: Citation[]): string {
  const lower = scope.toLowerCase();
  const blob = citationBlob(citations);

  if (lower.includes("ac-07") || blob.includes("peso")) {
    return `Compliance review for "${scope}" highlights PESO safety valve certificate expiry on AC-07, overdue maintenance records, and missing statutory evidence under Factory Act Sec 40B.`;
  }

  if (lower.includes("permit") || blob.includes("confined space")) {
    return `Compliance review for "${scope}" flags permit revalidation gaps after process changes, gas detector calibration overdue, and incomplete near-miss corrective actions for confined space entry.`;
  }

  return `Compliance review for "${scope}" detected gaps in maintenance record completeness, alarm investigation timelines, and permit revalidation after process changes.`;
}

function buildComplianceActions(
  scope: string,
  citations: Citation[]
): AgentAction[] {
  const lower = scope.toLowerCase();
  const blob = citationBlob(citations);

  if (lower.includes("ac-07") || blob.includes("compressor")) {
    return [
      {
        priority: "critical",
        title: "Renew AC-07 PESO safety valve certificate",
        description:
          "Certificate expires in 22 days. Schedule approved test and upload evidence to audit trail.",
        owner: "Utilities Team",
        dueIn: "15 days",
        citations: citations.filter((c) => c.documentTitle.includes("AC-07")),
      },
      {
        priority: "high",
        title: "Complete Factory Act Sec 40B logbook entries",
        description:
          "Attach signed inspection reports and abnormal event records for AC-07.",
        owner: "Maintenance Manager",
        dueIn: "5 days",
        citations: citations.filter((c) => c.documentType === "Regulatory"),
      },
      {
        priority: "medium",
        title: "Restore intercooler drain maintenance schedule",
        description:
          "Drain interval exceeded by 9 days on AC-07. Resume schedule and log completion for audit evidence.",
        owner: "Utilities Team",
        dueIn: "7 days",
        citations: citations.filter((c) => c.documentTitle.includes("AC-07")),
      },
    ];
  }

  return [
    {
      priority: "critical",
      title: "Document 24-hour vibration investigation",
      description:
        "OISD-GDN-118 requires documented investigation after alarm breach. Attach inspection and work order closure notes.",
      owner: "Maintenance Manager",
      dueIn: "24 hours",
      citations: citations.filter((c) => c.documentTitle.includes("OISD")),
    },
    {
      priority: "high",
      title: "Refresh permit revalidation workflow",
      description:
        "Implement auto-block for confined space entry when process conditions change or detector calibration is expired.",
      owner: "Safety Team",
      dueIn: "5 days",
      citations: citations.filter((c) => c.documentType === "Procedure"),
    },
    {
      priority: "medium",
      title: "Renew AC-07 safety valve certificate",
      description:
        "Certificate expires in 22 days. Schedule PESO-approved test before expiry.",
      owner: "Utilities Team",
      dueIn: "15 days",
      citations: citations.filter((c) => c.documentTitle.includes("AC-07")),
    },
  ];
}

export async function runMaintenanceRca(input: {
  equipmentTag: string;
  symptoms: string;
}): Promise<AgentResult> {
  const query = `${input.equipmentTag} ${input.symptoms} root cause failure maintenance`;
  const retrieved = retrieveRelevantChunks(query, 6);
  const citations = toCitations(retrieved, query);
  const knowledgeLinks = buildKnowledgeLinks(citations, input.equipmentTag);

  return {
    agent: "Maintenance RCA Agent",
    summary: buildRcaSummary(input.equipmentTag, input.symptoms, citations),
    confidence: citations.length > 0 ? 0.91 : 0.65,
    citations,
    knowledgeLinks,
    actions: buildRcaActions(input.equipmentTag, input.symptoms, citations),
  };
}

export async function runComplianceCheck(input: {
  scope: string;
}): Promise<AgentResult> {
  const query = `${input.scope} compliance audit factory act oisd permit inspection overdue`;
  const retrieved = retrieveRelevantChunks(query, 6);
  const citations = toCitations(retrieved, query);

  return {
    agent: "Compliance Intelligence Agent",
    summary: buildComplianceSummary(input.scope, citations),
    confidence: citations.length > 0 ? 0.88 : 0.65,
    citations,
    knowledgeLinks: buildKnowledgeLinks(citations, "Unit-2"),
    actions: buildComplianceActions(input.scope, citations),
  };
}

export function getDashboardStats() {
  return {
    documentsIndexed: 12,
    equipmentNodes: 18,
    complianceRules: 9,
    avgQueryTimeMs: 120,
  };
}
