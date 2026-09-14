/**
 * Deterministic contract checks for OpsMind.
 *
 * Runs against a live server (`npm run dev` or `npm run build && npm start`) so
 * it exercises the real API routes rather than the library functions in
 * isolation. Zero dependencies: `node scripts/verify.mjs`.
 *
 * Override the target with BASE_URL=https://... node scripts/verify.mjs
 */

import { readFile } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function request(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function post(path, body) {
  return (await request(path, body)).data;
}

/** Titles named in the answer's "Sources:" footer. */
function answerSources(answer) {
  const match = answer.match(/\*\*Sources:\*\*\s*(.+?)\.\s*$/s);
  if (!match) return [];
  return match[1]
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

const FIELD_NOTE = `P-101 Field Note - Night Shift 12 Sep 2026
Operator observed vibration of 7.8 mm/s RMS on the P-101 drive end bearing at 02:40.
Seal flush line to P-101 was found partially blocked; flow restored after cleaning.
Reference OISD-GDN-118 requires the excursion to be investigated within 24 hours.
Discharge temperature on P-101 held steady at 71 degC through the shift.`;

async function main() {
  console.log(`OpsMind verification against ${BASE}`);

  // ---------------------------------------------------------------- retrieval
  section("Retrieval and citation integrity");
  const isolation = await post("/api/chat", {
    query: "What is the isolation procedure for pump P-101 before opening the casing?",
  });

  const ids = isolation.citations.map((citation) => citation.documentId);
  check(
    "citations contain no duplicate documents",
    new Set(ids).size === ids.length,
    ids.join(", ")
  );
  check("isolation query returns evidence", isolation.citations.length >= 2);
  check(
    "answer only cites documents present in the citation list",
    answerSources(isolation.answer).every((title) =>
      isolation.citations.some((citation) => citation.documentTitle === title)
    ),
    `answer sources: ${answerSources(isolation.answer).join(" | ")}`
  );
  check(
    "isolation names suction valve V-101A",
    /V-101A/.test(isolation.answer),
    isolation.answer.slice(0, 180)
  );
  check(
    "isolation names discharge valve V-101B",
    /V-101B/.test(isolation.answer),
    isolation.answer.slice(0, 180)
  );
  check(
    "isolation names LOTO on MCC panel CP-2B",
    /LOTO/i.test(isolation.answer) && /CP-2B/.test(isolation.answer),
    isolation.answer.slice(0, 180)
  );
  const topThree = isolation.citations.slice(0, 3);
  check(
    "confidence is the mean of the top three source scores",
    Math.abs(
      isolation.confidence -
        topThree.reduce((sum, c) => sum + c.relevanceScore, 0) / topThree.length
    ) < 0.02,
    `confidence=${isolation.confidence}`
  );
  check(
    "the leading bullet is the most on-point sentence, not just the first one",
    /1\. \*\*[^*]+:\*\* Isolation Procedure/.test(isolation.answer),
    isolation.answer.split("\n").find((line) => line.startsWith("1. ")) ?? ""
  );
  check(
    "top score is an absolute measure, not a fixed rank artifact",
    isolation.citations[0].relevanceScore < 0.99,
    `top=${isolation.citations[0].relevanceScore}`
  );

  const weak = await post("/api/chat", {
    query: "How do I bake sourdough bread at home?",
  });
  check("out-of-corpus query returns no citations", weak.citations.length === 0);
  check("out-of-corpus query reports zero confidence", weak.confidence === 0);
  check(
    "out-of-corpus query says so instead of guessing",
    /No indexed plant record/i.test(weak.answer),
    weak.answer.slice(0, 100)
  );

  // ------------------------------------------------------------------- agents
  section("Agent branch consistency");
  const factoryAct = await post("/api/agents", {
    agent: "compliance",
    scope: "Unit-2 Factory Act maintenance records and vibration alarm investigations",
  });
  check(
    "Factory Act scope is not answered with an AC-07 PESO review",
    !/PESO|AC-07/.test(factoryAct.summary),
    factoryAct.summary.slice(0, 140)
  );
  check(
    "Factory Act actions match the Factory Act summary",
    factoryAct.actions.some((action) => /Factory Act/i.test(action.title)) &&
      !factoryAct.actions.some((action) => /PESO/i.test(action.title)),
    factoryAct.actions.map((action) => action.title).join(" | ")
  );

  const peso = await post("/api/agents", {
    agent: "compliance",
    scope: "AC-07 PESO safety valve certificate status",
  });
  check(
    "explicit PESO scope reaches the AC-07 branch",
    /PESO/.test(peso.summary) && peso.actions.some((a) => /PESO/i.test(a.title)),
    peso.summary.slice(0, 120)
  );

  const rca = await post("/api/agents", {
    agent: "rca",
    equipmentTag: "P-101",
    symptoms: "High vibration on drive end bearing and recurring mechanical seal leakage",
  });
  check(
    "P-101 RCA stays on the pump branch",
    /P-101/.test(rca.summary) && !/compressor|intercooler/i.test(rca.summary),
    rca.summary.slice(0, 140)
  );
  check(
    "P-101 template actions are citation-backed",
    rca.actions.length > 0 && rca.actions.every((action) => action.citations.length > 0),
    rca.actions.map((action) => `${action.title} (${action.citations.length})`).join(" | ")
  );
  check(
    "every action citation also appears in the result citations",
    rca.actions.every((action) =>
      action.citations.every((citation) =>
        rca.citations.some((item) => item.documentId === citation.documentId)
      )
    )
  );
  check(
    "actions are not padded with unrelated evidence",
    rca.actions.every((action) =>
      action.citations.every((citation) =>
        /seal|flush|leak|align|vibration|lubric|inspect|rca|repeat|root cause|0\.05|overdue/i.test(
          `${citation.documentTitle} ${citation.excerpt}`
        )
      )
    ),
    rca.actions
      .map((a) => `${a.title} <= ${a.citations.map((c) => c.documentTitle).join(",")}`)
      .join(" | ")
  );

  const unknown = await post("/api/agents", {
    agent: "rca",
    equipmentTag: "ZZ-999",
    symptoms: "Unexplained noise",
  });
  check(
    "unknown equipment refuses to fabricate a root cause",
    /No indexed record mentions ZZ-999/i.test(unknown.summary),
    unknown.summary.slice(0, 140)
  );
  check(
    "unknown equipment attaches no evidence",
    unknown.actions.every((action) => action.citations.length === 0) &&
      unknown.citations.length === 0 &&
      unknown.knowledgeLinks.length === 0 &&
      unknown.confidence === 0,
    `citations=${unknown.citations.length} links=${unknown.knowledgeLinks.length} confidence=${unknown.confidence}`
  );

  const offScope = await post("/api/agents", {
    agent: "compliance",
    scope: "sourdough starter fermentation temperature",
  });
  check(
    "a scope outside the corpus is refused, not answered generically",
    /No indexed record matches/i.test(offScope.summary) &&
      offScope.citations.length === 0,
    offScope.summary.slice(0, 140)
  );
  check(
    "unknown equipment does not emit pump actions",
    !unknown.actions.some((action) => /mechanical seal|laser alignment/i.test(action.title)),
    unknown.actions.map((action) => action.title).join(" | ")
  );

  const p102 = await post("/api/agents", {
    agent: "rca",
    equipmentTag: "P-102",
    symptoms: "High vibration on drive end bearing and recurring mechanical seal leakage",
  });
  check(
    "P-102 does not inherit the P-101 seal-failure playbook",
    /no failure template for P-102/i.test(p102.summary) &&
      !p102.actions.some((action) => /mechanical seal on P-102/i.test(action.title)),
    p102.summary.slice(0, 160)
  );
  check(
    "P-102 evidence is restricted to records that mention P-102",
    p102.citations.length > 0 &&
      !p102.citations.some((citation) =>
        /Work Order History – Pump P-101|Air Compressor AC-07/i.test(
          citation.documentTitle
        )
      ),
    p102.citations.map((citation) => citation.documentTitle).join(" | ")
  );

  const unknownAgent = await request("/api/agents", { agent: "payroll" });
  check(
    "unknown agent is rejected with 400",
    unknownAgent.status === 400 && Boolean(unknownAgent.data.error),
    `status=${unknownAgent.status}`
  );

  const geminiLocal = await post("/api/chat", {
    query: "What is the isolation procedure for pump P-101 before opening the casing?",
    useGemini: true,
  });
  check(
    "Gemini requested flag is returned even when the rewrite is skipped",
    geminiLocal.geminiRequested === true,
    `geminiRequested=${geminiLocal.geminiRequested} engine=${geminiLocal.engine}`
  );
  check(
    "Gemini checkbox cannot invent an engine other than local or gemini",
    geminiLocal.engine === "local" || geminiLocal.engine === "gemini",
    `engine=${geminiLocal.engine}`
  );

  // ------------------------------------------------------------------ uploads
  section("Upload pipeline and session isolation");
  const form = new FormData();
  form.append(
    "file",
    new Blob([FIELD_NOTE], { type: "text/plain" }),
    "P101-field-note.txt"
  );
  const uploadResponse = await fetch(`${BASE}/api/documents/upload`, {
    method: "POST",
    body: form,
  });
  const upload = await uploadResponse.json();

  check("upload succeeds", uploadResponse.ok && Boolean(upload.document), upload.error);
  const doc = upload.document;
  check(
    "upload extracts the equipment tag",
    doc.equipmentTags.includes("P-101"),
    doc.equipmentTags.join(", ")
  );
  check(
    "upload extracts the regulatory reference",
    doc.regulatoryRefs.some((ref) => /OISD/i.test(ref)),
    doc.regulatoryRefs.join(", ")
  );
  check("upload ids are namespaced for session replay", doc.id.startsWith("upload-"));

  const withUpload = await post("/api/chat", {
    query: "What vibration reading was recorded on P-101 in the field note?",
    sessionDocuments: [doc],
  });
  check(
    "uploaded record is immediately queryable",
    withUpload.citations.some((citation) => citation.documentId === doc.id),
    withUpload.citations.map((citation) => citation.documentTitle).join(" | ")
  );
  check(
    "answer surfaces the uploaded reading",
    /7\.8/.test(withUpload.answer),
    withUpload.answer.slice(0, 160)
  );

  const withoutUpload = await post("/api/chat", {
    query: "What vibration reading was recorded on P-101 in the field note?",
  });
  check(
    "upload does not leak into another visitor's session",
    !withoutUpload.citations.some((citation) => citation.documentId === doc.id),
    withoutUpload.citations.map((citation) => citation.documentId).join(" | ")
  );

  const csvRaw = await readFile(
    new URL("../samples/ac07-inspection-log.csv", import.meta.url),
    "utf8"
  );
  const csvForm = new FormData();
  csvForm.append(
    "file",
    new Blob([csvRaw], { type: "text/csv" }),
    "ac07-inspection-log.csv"
  );
  const csvUpload = await (
    await fetch(`${BASE}/api/documents/upload`, { method: "POST", body: csvForm })
  ).json();
  const csvDoc = csvUpload.document;

  check(
    "csv rows are flattened into searchable prose",
    /equipment tag: AC-07/i.test(csvDoc.content),
    csvDoc.content.slice(0, 90)
  );
  check(
    "csv tags are extracted from every row",
    ["AC-07", "P-102"].every((tag) => csvDoc.equipmentTags.includes(tag)),
    csvDoc.equipmentTags.join(", ")
  );
  check(
    "quoted csv commas do not split a cell",
    /Load held at 85 percent, cooling water inlet/.test(csvDoc.content)
  );
  const csvQuery = await post("/api/chat", {
    query: "What is the AC-07 intercooler drain interval status?",
    sessionDocuments: [csvDoc],
  });
  check(
    "an uploaded csv row outranks the seed corpus when it is more specific",
    csvQuery.citations[0]?.documentId === csvDoc.id,
    csvQuery.citations.map((citation) => citation.documentTitle).join(" | ")
  );

  // ------------------------------------------------------------------- corpus
  section("Corpus and knowledge graph");
  const seedCorpus = await post("/api/documents", {});
  const sessionCorpus = await post("/api/documents", { sessionDocuments: [doc] });

  check(
    "session upload increases the indexed count by exactly one",
    sessionCorpus.stats.documentsIndexed === seedCorpus.stats.documentsIndexed + 1,
    `${seedCorpus.stats.documentsIndexed} -> ${sessionCorpus.stats.documentsIndexed}`
  );
  check(
    "asset tag count excludes free-text descriptors",
    seedCorpus.stats.assetTags > 0 &&
      seedCorpus.stats.assetTags <
        seedCorpus.graph.nodes.filter((node) => node.type === "equipment").length,
    `assetTags=${seedCorpus.stats.assetTags}`
  );
  check(
    "uploaded record appears as a graph node",
    sessionCorpus.graph.nodes.some((node) => node.label === doc.title),
    doc.title
  );
  check(
    "graph edges carry a human-readable meaning",
    sessionCorpus.graph.edges.every((edge) => Boolean(edge.meaning))
  );
  check(
    "graph edges are deduplicated",
    new Set(sessionCorpus.graph.edges.map((edge) => edge.id)).size ===
      sessionCorpus.graph.edges.length
  );
  check(
    "isolation valves are not treated as failure-mode hosts",
    !seedCorpus.graph.edges.some(
      (edge) =>
        (edge.from === "equipment:v-101a" || edge.from === "equipment:v-101b") &&
        edge.relation === "has_failure_mode"
    )
  );
  check(
    "P-101 still carries a seal-related failure edge from work orders",
    seedCorpus.graph.edges.some(
      (edge) =>
        edge.from === "equipment:p-101" && edge.relation === "has_failure_mode"
    )
  );

  const forged = await post("/api/documents", {
    sessionDocuments: [{ ...doc, id: "doc-sop-p101", title: "Forged SOP" }],
  });
  check(
    "a client cannot shadow a seed document id",
    !forged.documents.some((item) => item.title === "Forged SOP"),
    `count=${forged.stats.documentsIndexed}`
  );

  // -------------------------------------------------------------------- pages
  section("Route availability");
  for (const route of [
    "/",
    "/copilot",
    "/agents/rca",
    "/agents/compliance",
    "/documents",
    "/graph",
    "/architecture",
  ]) {
    const response = await fetch(`${BASE}${route}`);
    check(`GET ${route} returns 200`, response.status === 200, `status=${response.status}`);
  }

  console.log(
    `\n${passed} passed, ${failures.length} failed out of ${passed + failures.length}`
  );
  if (failures.length) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\nVerification could not run: ${error.message}`);
  console.error(`Is the server running at ${BASE}? Start it with: npm run dev`);
  process.exit(1);
});
