import { getGraphLinksForEquipment, getGraphStats } from "./knowledge-graph";
import { getAllDocuments, retrieveRelevantChunks, type RetrievalHit } from "./rag";
import { buildSmartExcerpt, synthesizeFromRetrieval } from "./synthesis";
import type {
  AgentAction,
  AgentResult,
  Citation,
  IndustrialDocument,
  KnowledgeLink,
} from "./types";

function toCitations(hits: RetrievalHit[], query: string): Citation[] {
  return hits.map((hit) => ({
    documentId: hit.document.id,
    documentTitle: hit.document.title,
    documentType: hit.document.type,
    excerpt: buildSmartExcerpt(hit.document.content, query),
    relevanceScore: hit.score,
  }));
}

function fullTextMap(hits: RetrievalHit[]): Map<string, string> {
  return new Map(hits.map((hit) => [hit.document.id, hit.document.content]));
}

function evidenceText(citation: Citation, fullById: Map<string, string>): string {
  return `${citation.documentTitle} ${citation.excerpt} ${
    fullById.get(citation.documentId) ?? ""
  }`.toLowerCase();
}

function evidenceBlob(citations: Citation[], fullById: Map<string, string>): string {
  return citations.map((citation) => evidenceText(citation, fullById)).join(" ");
}

function citationBlob(citations: Citation[]): string {
  return citations
    .map((citation) => `${citation.documentTitle} ${citation.excerpt}`.toLowerCase())
    .join(" ");
}

function joinClauses(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/**
 * Returns only citations whose full record mentions the action's subject.
 * Matching the truncated excerpt alone dropped valid OEM limits (0.05 mm) and
 * let template actions fire with empty citation lists.
 */
function citationsMatching(
  citations: Citation[],
  keywords: string[],
  fullById: Map<string, string>
): Citation[] {
  return citations
    .filter((citation) => {
      const text = evidenceText(citation, fullById);
      return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    })
    .slice(0, 2);
}

/**
 * Scored over the top three sources, which are the ones the answer is actually
 * built from. Averaging the whole tail dragged a strong answer down toward the
 * weakest thing that happened to match.
 */
const CONFIDENCE_SAMPLE = 3;

function averageConfidence(citations: Citation[]): number {
  if (!citations.length) return 0;
  const sample = citations.slice(0, CONFIDENCE_SAMPLE);
  const total = sample.reduce((sum, citation) => sum + citation.relevanceScore, 0);
  return Number((total / sample.length).toFixed(2));
}

function mentionsTag(tag: string, hits: RetrievalHit[]): boolean {
  const needle = tag.toUpperCase();
  if (!needle) return false;
  return hits.some(
    (hit) =>
      hit.document.equipmentTags.some((item) => item.toUpperCase() === needle) ||
      hit.document.content.toUpperCase().includes(needle)
  );
}

/** Most frequently tagged asset across the evidence, used to anchor graph links. */
function dominantAssetTag(hits: RetrievalHit[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const hit of hits) {
    for (const tag of hit.document.equipmentTags) {
      if (!/^[A-Z]{1,3}-\d{2,4}[A-Z]?$/.test(tag.toUpperCase())) continue;
      const key = tag.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  let best = fallback;
  let bestCount = 0;
  for (const [tag, count] of counts) {
    if (count > bestCount) {
      best = tag;
      bestCount = count;
    }
  }
  return best;
}

function buildKnowledgeLinks(
  citations: Citation[],
  equipmentTag: string,
  sessionDocuments: IndustrialDocument[] = []
): KnowledgeLink[] {
  const tag = equipmentTag.toUpperCase();
  const links: KnowledgeLink[] = [];

  // Each rule needs a citation that actually mentions the subject; without one
  // the link is asserted, not derived.
  const rules: Array<{ keywords: string[]; from: string; relation: string; to: string }> = [
    { keywords: ["seal", "leak"], from: tag, relation: "has_recurring_failure", to: "Mechanical Seal Failure" },
    { keywords: ["vibration"], from: tag, relation: "exceeds_limit", to: "Vibration Limit Exceedance" },
    { keywords: ["oisd", "factory act"], from: tag, relation: "requires", to: "Regulatory Investigation" },
    { keywords: ["temperature"], from: tag, relation: "trending_high", to: "Discharge Temperature Alarm" },
    { keywords: ["peso", "safety valve"], from: tag, relation: "approaching_expiry", to: "PESO Certificate" },
    { keywords: ["confined space", "permit"], from: tag, relation: "governed_by", to: "Permit-to-Work Rule" },
  ];

  for (const rule of rules) {
    const source = citations.find((citation) =>
      rule.keywords.some((keyword) =>
        `${citation.documentTitle} ${citation.excerpt}`.toLowerCase().includes(keyword)
      )
    );
    if (!source) continue;
    links.push({
      from: rule.from,
      relation: rule.relation,
      to: rule.to,
      source: source.documentTitle,
    });
  }

  for (const graphLink of getGraphLinksForEquipment(tag, 4, sessionDocuments)) {
    const exists = links.some(
      (link) => link.to === graphLink.to && link.relation === graphLink.relation
    );
    if (!exists) links.push(graphLink);
  }

  return links.slice(0, 6);
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
                  text: `${prompt}\n\nUse numbered steps where appropriate. Cite document titles inline. Do not invent limits or valve tags that are not in context.\n\nContext:\n${fullContext}`,
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

export async function answerWithRag(
  query: string,
  options: {
    useGemini?: boolean;
    sessionDocuments?: IndustrialDocument[];
  } = {}
) {
  const sessionDocuments = options.sessionDocuments ?? [];
  const hits = retrieveRelevantChunks(query, 6, sessionDocuments);
  const citations = toCitations(hits, query);

  const fullContext = hits
    .map(
      (hit, index) =>
        `[${index + 1}] ${hit.document.title} (${hit.document.type}):\n${hit.chunk.content}`
    )
    .join("\n\n");

  let engine: "local" | "gemini" = "local";
  let answer = synthesizeFromRetrieval(query, hits);

  // Gemini is only allowed to rephrase retrieved context, never to answer from
  // its own knowledge, so an empty corpus result stays an empty corpus result.
  if (options.useGemini && hits.length) {
    const geminiAnswer = await maybeCallGemini(
      `You are OpsMind, an industrial knowledge copilot. Answer thoroughly using ONLY the context below.\n\nQuestion: ${query}`,
      fullContext
    );
    if (geminiAnswer) {
      answer = geminiAnswer;
      engine = "gemini";
    }
  }

  return {
    answer,
    citations,
    confidence: averageConfidence(citations),
    engine,
    geminiRequested: Boolean(options.useGemini),
  };
}

type RcaBranch = "ac07" | "boiler" | "pump" | "evidence" | "none";

/** Failure playbooks are bound to a specific tag, not a family prefix. */
const RCA_TEMPLATES: Record<string, Exclude<RcaBranch, "evidence" | "none">> = {
  "P-101": "pump",
  "AC-07": "ac07",
  "B-401": "boiler",
};

/**
 * The equipment tag decides the analysis, not whatever happened to be retrieved.
 * A prefix match on P-10x used to hand P-102 the P-101 seal-failure playbook.
 */
function resolveRcaBranch(
  equipmentTag: string,
  _symptoms: string,
  hits: RetrievalHit[]
): RcaBranch {
  if (!hits.length) return "none";

  const tag = equipmentTag.trim().toUpperCase();
  if (tag && !mentionsTag(tag, hits)) return "none";

  return RCA_TEMPLATES[tag] ?? "evidence";
}

function evidenceReviewActions(
  equipmentTag: string,
  citations: Citation[]
): AgentAction[] {
  const tag = equipmentTag.toUpperCase() || "the asset";
  return citations.slice(0, 3).map((citation, index) => ({
    priority: index === 0 ? ("high" as const) : ("medium" as const),
    title: `Review ${citation.documentTitle} against the reported symptoms`,
    description: `This record is the strongest match for ${tag} at ${Math.round(
      citation.relevanceScore * 100
    )}% relevance. Confirm whether its findings explain the observed behaviour before assigning a cause.`,
    owner: "Reliability Engineer",
    dueIn: "7 days",
    citations: [citation],
  }));
}

/** Template actions that cannot cite a matching record are dropped, not shown as fact. */
function keepCitedActions(
  actions: AgentAction[],
  fallback: AgentAction[]
): AgentAction[] {
  const kept = actions.filter((action) => action.citations.length > 0);
  return kept.length ? kept : fallback;
}

function evidenceReviewSummary(
  equipmentTag: string,
  symptoms: string,
  citations: Citation[]
): string {
  const tag = equipmentTag.toUpperCase() || "the selected asset";
  return `OpsMind has no failure template for ${tag}, so this analysis is assembled directly from the ${citations.length} matching record${citations.length === 1 ? "" : "s"} below. Observed: ${symptoms}.`;
}

function buildRcaSummary(
  equipmentTag: string,
  symptoms: string,
  branch: RcaBranch,
  citations: Citation[],
  fullById: Map<string, string>
): string {
  const tag = equipmentTag.toUpperCase() || "the selected asset";
  const blob = evidenceBlob(citations, fullById);

  switch (branch) {
    case "ac07": {
      const facts: string[] = [];
      if (/108|temperature/.test(blob)) {
        facts.push("discharge temperature trending toward the alarm threshold");
      }
      if (/intercooler|drain/.test(blob)) {
        facts.push("overdue intercooler drain maintenance");
      }
      if (/peso|certificate/.test(blob)) {
        facts.push("an approaching PESO safety valve certificate expiry");
      }
      if (!facts.length) return evidenceReviewSummary(equipmentTag, symptoms, citations);
      return `Analysis for ${tag} indicates ${joinClauses(facts)} — a combined reliability and compliance risk. Observed: ${symptoms}.`;
    }
    case "boiler": {
      const facts: string[] = [];
      if (/dcs|timeline|work order|operator/.test(blob)) {
        facts.push("timeline reconstruction from DCS logs, work orders, and operator records");
      }
      if (/90|reliability board|repeat/.test(blob)) {
        facts.push("escalation to the site reliability board if a repeat trip occurs within 90 days");
      }
      if (!facts.length) return evidenceReviewSummary(equipmentTag, symptoms, citations);
      return `Analysis for ${tag} recommends a formal RCA using the boiler trip template: ${joinClauses(facts)}. Observed: ${symptoms}.`;
    }
    case "pump": {
      const facts: string[] = [];
      if (/seal|leak|flush/.test(blob)) facts.push("deferred seal replacement");
      if (/align|0\.05/.test(blob)) facts.push("alignment gaps after maintenance");
      if (/vibration|mm\/s/.test(blob)) {
        facts.push("insufficient follow-up on vibration excursions");
      }
      if (!facts.length) return evidenceReviewSummary(equipmentTag, symptoms, citations);
      return `Repeat failures on ${tag} are associated with ${joinClauses(facts)}. Observed: ${symptoms}.`;
    }
    case "evidence":
      return evidenceReviewSummary(equipmentTag, symptoms, citations);
    default:
      return `No indexed record mentions ${tag}. OpsMind will not attribute a root cause without evidence — upload the relevant work orders, inspection reports, or OEM manual on the Documents page and re-run this analysis.`;
  }
}

function buildRcaActions(
  equipmentTag: string,
  citations: Citation[],
  branch: RcaBranch,
  fullById: Map<string, string>
): AgentAction[] {
  const tag = equipmentTag.toUpperCase() || "the asset";

  if (branch === "none") {
    return [
      {
        priority: "high",
        title: `Ingest maintenance history for ${tag}`,
        description:
          "No work orders, inspection reports, or OEM guidance for this asset are indexed. Upload them on the Documents page so the RCA can be evidence-backed.",
        owner: "Reliability Engineer",
        dueIn: "Before analysis",
        citations: [],
      },
    ];
  }

  if (branch === "evidence") {
    return evidenceReviewActions(equipmentTag, citations);
  }

  if (branch === "ac07") {
    return keepCitedActions(
      [
        {
          priority: "critical",
          title: "Investigate discharge temperature trend before alarm",
          description:
            "Discharge temperature at 108Â°C is approaching the 110Â°C alarm. Inspect cooling, lubrication, and load conditions immediately.",
          owner: "Utilities Team",
          dueIn: "24 hours",
          citations: citationsMatching(citations, ["temperature", "108", "ac-07"], fullById),
        },
        {
          priority: "high",
          title: "Restore intercooler drain schedule",
          description:
            "Drain interval exceeded by 9 days — moisture carryover risk. Resume schedule and log completion.",
          owner: "Maintenance Planner",
          dueIn: "48 hours",
          citations: citationsMatching(citations, ["intercooler", "drain", "moisture"], fullById),
        },
        {
          priority: "high",
          title: "Renew PESO safety valve certificate",
          description:
            "Certificate expires in 22 days. Schedule a PESO-approved test before expiry.",
          owner: "Safety Team",
          dueIn: "15 days",
          citations: citationsMatching(citations, ["peso", "certificate", "safety valve"], fullById),
        },
      ],
      evidenceReviewActions(equipmentTag, citations)
    );
  }

  if (branch === "boiler") {
    return keepCitedActions(
      [
        {
          priority: "high",
          title: `Reconstruct ${tag} trip timeline from DCS and work orders`,
          description:
            "Collect DCS snapshots, operator logs, and open work orders before assigning physical vs human causes.",
          owner: "Reliability Engineer",
          dueIn: "48 hours",
          citations: citationsMatching(citations, ["boiler", "rca", "timeline"], fullById),
        },
        {
          priority: "medium",
          title: "Escalate if a repeat trip occurs within 90 days",
          description:
            "The RCA template requires site reliability board review for repeat boiler events.",
          owner: "Site Reliability Lead",
          dueIn: "14 days",
          citations: citationsMatching(citations, ["90", "reliability", "board"], fullById),
        },
      ],
      evidenceReviewActions(equipmentTag, citations)
    );
  }

  return keepCitedActions(
    [
      {
        priority: "critical",
        title: `Replace mechanical seal on ${tag} and verify flush plan`,
        description:
          "Seal leakage and temperature excursions indicate seal face damage. Replace using the OEM kit and confirm seal flush flow meets the manual's minimum.",
        owner: "Rotating Equipment Team",
        dueIn: "48 hours",
        citations: citationsMatching(citations, ["seal", "flush", "leak"], fullById),
      },
      {
        priority: "high",
        title: "Perform laser alignment to OEM tolerance",
        description:
          "Post-maintenance vibration spikes suggest misalignment. Align to the offset tolerance stated in the OEM manual.",
        owner: "Maintenance Engineering",
        dueIn: "72 hours",
        citations: citationsMatching(citations, ["alignment", "vibration", "0.05"], fullById),
      },
      {
        priority: "high",
        title: "Close overdue lubrication and inspection gaps",
        description:
          "Restore the monthly lubrication schedule and upload the signed inspection checklist.",
        owner: "Maintenance Planner",
        dueIn: "7 days",
        citations: citationsMatching(citations, ["lubrication", "inspection", "overdue"], fullById),
      },
      {
        priority: "medium",
        title: "Conduct formal RCA and reliability board review",
        description:
          "Repeat failures within 12 months trigger escalation per the RCA template.",
        owner: "Site Reliability Lead",
        dueIn: "14 days",
        citations: citationsMatching(citations, ["rca", "repeat", "root cause"], fullById),
      },
    ],
    evidenceReviewActions(equipmentTag, citations)
  );
}

type ComplianceBranch = "ac07" | "permit" | "general" | "none";

/**
 * Scope wording wins. Deciding from the retrieved blob meant "Unit-2 Factory Act
 * audit" returned an AC-07 PESO review purely because the compressor inspection
 * report ranked highly.
 */
function resolveComplianceBranch(
  scope: string,
  citations: Citation[]
): ComplianceBranch {
  if (!citations.length) return "none";

  const lower = scope.toLowerCase();

  if (/ac-?07|compressor|peso|safety valve/.test(lower)) return "ac07";
  if (/permit|confined|entry|hot work|isolation certificate/.test(lower)) {
    return "permit";
  }
  if (/factory act|40b|logbook|record|vibration|inspection|oisd|audit|unit/.test(lower)) {
    return "general";
  }

  // Only an ambiguous scope falls back to what the evidence suggests.
  const blob = citationBlob(citations);
  if (blob.includes("peso") || blob.includes("compressor")) return "ac07";
  if (blob.includes("confined space")) return "permit";
  return "general";
}

function buildComplianceSummary(
  scope: string,
  branch: ComplianceBranch,
  citations: Citation[],
  fullById: Map<string, string>
): string {
  const blob = evidenceBlob(citations, fullById);

  switch (branch) {
    case "ac07": {
      const facts: string[] = [];
      if (/peso|certificate/.test(blob)) {
        facts.push("the PESO safety valve certificate expiry on AC-07");
      }
      if (/overdue|intercooler|drain/.test(blob)) {
        facts.push("overdue maintenance records");
      }
      if (/factory act|40b|logbook/.test(blob)) {
        facts.push("missing statutory evidence under Factory Act Sec 40B");
      }
      if (!facts.length) {
        return `Compliance review for "${scope}" is limited to the matching records below. No templated PESO gap could be cited from those sources.`;
      }
      return `Compliance review for "${scope}" highlights ${joinClauses(facts)}.`;
    }
    case "permit": {
      const facts: string[] = [];
      if (/permit|process/.test(blob)) {
        facts.push("permit revalidation gaps after process changes");
      }
      if (/detector|calibration/.test(blob)) {
        facts.push("overdue gas detector calibration");
      }
      if (/near-miss|confined|corrective/.test(blob)) {
        facts.push("incomplete near-miss corrective actions for confined space entry");
      }
      if (!facts.length) {
        return `Compliance review for "${scope}" is limited to the matching records below. No templated permit gap could be cited from those sources.`;
      }
      return `Compliance review for "${scope}" flags ${joinClauses(facts)}.`;
    }
    case "general": {
      const facts: string[] = [];
      if (/record|logbook|40b/.test(blob)) {
        facts.push("gaps in maintenance record completeness");
      }
      if (/oisd|vibration|24/.test(blob)) {
        facts.push("alarm investigation timelines");
      }
      if (/factory act|statutory/.test(blob)) {
        facts.push("statutory logbook evidence under Factory Act Sec 40B / OISD-GDN-118");
      }
      if (!facts.length) {
        return `Compliance review for "${scope}" is limited to the matching records below. No templated Factory Act gap could be cited from those sources.`;
      }
      return `Compliance review for "${scope}" detected ${joinClauses(facts)}.`;
    }
    default:
      return `No indexed record matches "${scope}". OpsMind will not report compliance gaps without evidence — narrow the scope to an indexed asset or upload the relevant regulatory records first.`;
  }
}

function buildComplianceActions(
  citations: Citation[],
  branch: ComplianceBranch,
  fullById: Map<string, string>
): AgentAction[] {
  if (branch === "none") {
    return [
      {
        priority: "high",
        title: "Ingest the statutory records for this scope",
        description:
          "No Factory Act, OISD, or PESO evidence matching this scope is indexed. Upload the applicable records on the Documents page and re-run the check.",
        owner: "Compliance Lead",
        dueIn: "Before audit",
        citations: [],
      },
    ];
  }

  if (branch === "ac07") {
    return keepCitedActions(
      [
        {
          priority: "critical",
          title: "Renew AC-07 PESO safety valve certificate",
          description:
            "Certificate expires in 22 days. Schedule the approved test and upload evidence to the audit trail.",
          owner: "Utilities Team",
          dueIn: "15 days",
          citations: citationsMatching(citations, ["peso", "ac-07", "certificate"], fullById),
        },
        {
          priority: "high",
          title: "Complete Factory Act Sec 40B logbook entries",
          description:
            "Attach signed inspection reports and abnormal event records for AC-07.",
          owner: "Maintenance Manager",
          dueIn: "5 days",
          citations: citationsMatching(citations, ["factory act", "40b", "logbook"], fullById),
        },
        {
          priority: "medium",
          title: "Restore intercooler drain maintenance schedule",
          description:
            "Drain interval exceeded by 9 days on AC-07. Resume the schedule and log completion as audit evidence.",
          owner: "Utilities Team",
          dueIn: "7 days",
          citations: citationsMatching(citations, ["intercooler", "drain", "ac-07"], fullById),
        },
      ],
      citations.slice(0, 3).map((citation, index) => ({
        priority: index === 0 ? ("high" as const) : ("medium" as const),
        title: `Review ${citation.documentTitle} for this compliance scope`,
        description: citation.excerpt,
        owner: "Compliance Lead",
        dueIn: "7 days",
        citations: [citation],
      }))
    );
  }

  if (branch === "permit") {
    return keepCitedActions(
      [
        {
          priority: "critical",
          title: "Revalidate the confined-space permit after process change",
          description:
            "The near-miss record shows the permit was not refreshed after a process upset.",
          owner: "Safety Team",
          dueIn: "24 hours",
          citations: citationsMatching(citations, ["permit", "v-220", "confined"], fullById),
        },
        {
          priority: "high",
          title: "Block entry when gas detector calibration is expired",
          description:
            "Detector calibration was overdue by 18 days. Auto-block entry until a valid certificate is attached.",
          owner: "Permit Controller",
          dueIn: "5 days",
          citations: citationsMatching(citations, ["detector", "calibration", "gas"], fullById),
        },
        {
          priority: "medium",
          title: "Close the Rule 68 work-permit audit trail",
          description:
            "Attach gas test sheets and LOTO records for hazardous-area maintenance.",
          owner: "Maintenance Manager",
          dueIn: "7 days",
          citations: citationsMatching(citations, ["rule 68", "permit", "loto"], fullById),
        },
      ],
      citations.slice(0, 3).map((citation, index) => ({
        priority: index === 0 ? ("high" as const) : ("medium" as const),
        title: `Review ${citation.documentTitle} for this compliance scope`,
        description: citation.excerpt,
        owner: "Compliance Lead",
        dueIn: "7 days",
        citations: [citation],
      }))
    );
  }

  return keepCitedActions(
    [
      {
        priority: "critical",
        title: "Document the 24-hour vibration investigation",
        description:
          "OISD-GDN-118 requires a documented investigation after an alarm breach. Attach the inspection and work order closure notes.",
        owner: "Maintenance Manager",
        dueIn: "24 hours",
        citations: citationsMatching(citations, ["oisd", "vibration", "24"], fullById),
      },
      {
        priority: "high",
        title: "Complete the Factory Act Sec 40B maintenance logbook",
        description:
          "Signed inspection reports and abnormal-event records are required for critical machinery.",
        owner: "Maintenance Manager",
        dueIn: "5 days",
        citations: citationsMatching(citations, ["factory act", "40b", "logbook"], fullById),
      },
      {
        priority: "medium",
        title: "Close overdue inspection evidence gaps",
        description:
          "The Factory Act checklist flags non-compliance when inspections are overdue by more than 15 days.",
        owner: "Reliability Planner",
        dueIn: "7 days",
        citations: citationsMatching(citations, ["overdue", "inspection", "15"], fullById),
      },
    ],
    citations.slice(0, 3).map((citation, index) => ({
      priority: index === 0 ? ("high" as const) : ("medium" as const),
      title: `Review ${citation.documentTitle} for this compliance scope`,
      description: citation.excerpt,
      owner: "Compliance Lead",
      dueIn: "7 days",
      citations: [citation],
    }))
  );
}

export async function runMaintenanceRca(input: {
  equipmentTag: string;
  symptoms: string;
  sessionDocuments?: IndustrialDocument[];
}): Promise<AgentResult> {
  const sessionDocuments = input.sessionDocuments ?? [];
  const query = `${input.equipmentTag} ${input.symptoms} root cause failure maintenance`;
  const retrieved = retrieveRelevantChunks(query, 6, sessionDocuments);
  const tag = input.equipmentTag.trim().toUpperCase();
  const hits = tag
    ? retrieved.filter((hit) => mentionsTag(tag, [hit]))
    : retrieved;
  const citations = toCitations(hits, query);
  const fullById = fullTextMap(hits);
  const branch = resolveRcaBranch(input.equipmentTag, input.symptoms, hits);
  const anchor = tag || dominantAssetTag(hits, "Unit-2");

  // Records that merely share generic words like "failure" are not evidence about
  // this asset. Showing them would contradict the summary and inflate confidence.
  if (branch === "none") {
    return {
      agent: "Maintenance RCA Agent",
      summary: buildRcaSummary(input.equipmentTag, input.symptoms, branch, [], fullById),
      confidence: 0,
      citations: [],
      knowledgeLinks: [],
      actions: buildRcaActions(input.equipmentTag, [], branch, fullById),
    };
  }

  return {
    agent: "Maintenance RCA Agent",
    summary: buildRcaSummary(input.equipmentTag, input.symptoms, branch, citations, fullById),
    confidence: averageConfidence(citations),
    citations,
    knowledgeLinks: buildKnowledgeLinks(citations, anchor, sessionDocuments),
    actions: buildRcaActions(input.equipmentTag, citations, branch, fullById),
  };
}

export async function runComplianceCheck(input: {
  scope: string;
  sessionDocuments?: IndustrialDocument[];
}): Promise<AgentResult> {
  const sessionDocuments = input.sessionDocuments ?? [];
  const query = `${input.scope} compliance audit factory act oisd permit inspection overdue`;
  const hits = retrieveRelevantChunks(query, 6, sessionDocuments);
  const citations = toCitations(hits, query);
  const fullById = fullTextMap(hits);

  // The augmented query always matches the regulatory seed documents, so relevance
  // is judged against the caller's own scope wording. Without this, an unrelated
  // scope still produced a confident Factory Act review.
  const scopeIsInCorpus =
    retrieveRelevantChunks(input.scope, 1, sessionDocuments).length > 0;
  const branch = scopeIsInCorpus
    ? resolveComplianceBranch(input.scope, citations)
    : "none";

  if (branch === "none") {
    return {
      agent: "Compliance Intelligence Agent",
      summary: buildComplianceSummary(input.scope, branch, [], fullById),
      confidence: 0,
      citations: [],
      knowledgeLinks: [],
      actions: buildComplianceActions([], branch, fullById),
    };
  }

  return {
    agent: "Compliance Intelligence Agent",
    summary: buildComplianceSummary(input.scope, branch, citations, fullById),
    confidence: averageConfidence(citations),
    citations,
    knowledgeLinks: buildKnowledgeLinks(
      citations,
      dominantAssetTag(hits, "Unit-2"),
      sessionDocuments
    ),
    actions: buildComplianceActions(citations, branch, fullById),
  };
}

export function getDashboardStats(sessionDocuments: IndustrialDocument[] = []) {
  const graphStats = getGraphStats(sessionDocuments);

  return {
    documentsIndexed: getAllDocuments(sessionDocuments).length,
    assetTags: graphStats.assetTagNodes,
    complianceRules: graphStats.regulationNodes,
    graphEdges: graphStats.edgeCount,
  };
}
