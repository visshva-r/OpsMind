import Link from "next/link";
import { PageHeader } from "@/components/ui";

const layers = [
  {
    title: "Document Ingestion Layer",
    items: [
      "Seeded SOPs, work orders, inspection reports, manuals",
      "Live upload for .txt / .md with entity tag extraction",
      "Equipment tags + regulatory refs parsed on ingest",
    ],
  },
  {
    title: "Knowledge Processing Layer",
    items: [
      "Word-chunking with overlap (320 / 60 tokens)",
      "Keyword-scored local RAG retrieval with citations",
      "Knowledge graph built from equipment, docs, regulations, failure modes",
    ],
  },
  {
    title: "Intelligence Layer",
    items: [
      "Expert Knowledge Copilot (Q&A + citations + optional Gemini)",
      "Maintenance RCA Agent (root cause + prioritized actions)",
      "Compliance Intelligence Agent (audit gaps + action queue)",
    ],
  },
  {
    title: "Output Layer",
    items: [
      "Source-cited answers with confidence scores",
      "Click-through citations to originating documents",
      "Graph view + exportable RCA / compliance action reports",
    ],
  },
];

export default function ArchitecturePage() {
  return (
    <div>
      <PageHeader
        title="System Architecture"
        description="OpsMind architecture for PS-8: unified industrial knowledge ingestion, retrieval, knowledge graph linking, and agentic intelligence."
        badge="Honest implementation map"
      />

      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          {[
            "Heterogeneous Plant Documents + Uploads",
            "↓",
            "Ingestion · Chunking · Entity Tagging",
            "↓",
            "Local RAG Retrieval + Knowledge Graph",
            "↓",
            "Copilot · RCA Agent · Compliance Agent",
            "↓",
            "Cited Answers · Graph Links · Action Queues",
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
        <h2 className="text-lg font-medium text-white">Tech Stack</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Next.js 15",
            "React 19",
            "Tailwind CSS",
            "Local keyword RAG",
            "Knowledge graph (metadata-derived)",
            "Gemini API (optional)",
            "TypeScript",
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
          Submission snapshot: Git tag{" "}
          <code className="rounded bg-slate-950 px-1.5 py-0.5 text-cyan-300">
            v1.0-submission
          </code>
          . Post-deadline commits add upload pipeline, knowledge graph view, citation
          deep-links, and computed dashboard metrics.{" "}
          <Link href="/graph" className="text-cyan-400 hover:text-cyan-300">
            View knowledge graph →
          </Link>
        </p>
      </section>
    </div>
  );
}
