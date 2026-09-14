import Link from "next/link";
import { PageHeader } from "@/components/ui";

const layers = [
  {
    title: "Document Ingestion",
    items: [
      "Seeded industrial corpus plus live .txt / .md / .csv / .json upload",
      "Equipment tags and regulatory refs extracted on ingest",
      "Uploads are parsed but never stored server-side, so sessions stay isolated",
    ],
  },
  {
    title: "Knowledge Processing",
    items: [
      "Full-document indexing plus section chunks, scored one hit per document",
      "Keyword / BM25-style local RAG — not vector embeddings",
      "Metadata-derived knowledge graph (equipment → document → regulation → failure)",
    ],
  },
  {
    title: "Intelligence",
    items: [
      "Copilot Q&A with citations (local RAG default)",
      "Optional Gemini rewrite — click-only, never the default path",
      "RCA and Compliance agents with a single branch decision for summary + actions",
      "RCA playbooks are tag-exact (P-101 / AC-07 / B-401); other indexed tags get evidence review",
    ],
  },
  {
    title: "Outputs",
    items: [
      "Cited answers with click-through document highlights",
      "Exportable RCA / compliance reports that match on-screen evidence",
      "Filterable graph with explicit relation meanings",
    ],
  },
];

export default function ArchitecturePage() {
  return (
    <div>
      <PageHeader
        title="System Architecture"
        description="OpsMind is a local-first industrial knowledge layer: ingest plant records, retrieve grounded answers, and run maintenance / compliance agents over the same corpus."
      />

      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          {[
            "Plant documents + session uploads",
            "↓",
            "Parse · chunk · extract entities",
            "↓",
            "Keyword RAG + knowledge graph",
            "↓",
            "Copilot · RCA · Compliance",
            "↓",
            "Cited answers · action reports · graph",
          ].map((line, index) => (
            <div
              key={`flow-${index}`}
              className={
                line === "↓"
                  ? "text-cyan-400"
                  : "w-full max-w-xl rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-200"
              }
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {layers.map((layer) => (
          <section
            key={layer.title}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <h2 className="text-lg font-medium text-white">{layer.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {layer.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-cyan-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-medium text-white">What this is — and is not</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>• Retrieval is keyword-scored local RAG over a curated corpus. There is no vector database.</li>
          <li>• Gemini is an optional rewrite of an already-retrieved context window, not the retrieval engine.</li>
          <li>• Session uploads live in the browser and are sent with API requests. That is intentional for Vercel/serverless.</li>
          <li>• Match percentages come from term coverage and TF-IDF weight, so they are absolute rather than a ranking artifact. A weak match shows a low number.</li>
          <li>• Nothing is answered from outside the corpus. An unmatched question, scope, or equipment tag returns a refusal with no citations instead of a plausible-looking analysis.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Next.js 15",
            "React 19",
            "TypeScript",
            "Tailwind CSS",
            "Local keyword RAG",
            "Metadata knowledge graph",
            "Gemini (optional)",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400">
          <Link href="/graph" className="text-cyan-400 hover:text-cyan-300">
            Open the knowledge graph →
          </Link>
        </p>
      </section>
    </div>
  );
}
