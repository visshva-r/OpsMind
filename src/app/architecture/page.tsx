import { PageHeader } from "@/components/ui";

const layers = [
  {
    title: "Document Ingestion Layer",
    items: [
      "SOPs, Work Orders, Inspection Reports",
      "OEM Manuals, P&ID Excerpts, Regulatory Docs",
      "OCR-ready pipeline (PDF, scanned forms, spreadsheets)",
    ],
  },
  {
    title: "Knowledge Processing Layer",
    items: [
      "Chunking + entity tagging (equipment, regulations)",
      "Local vector retrieval (RAG) under 120ms",
      "Knowledge graph links (equipment → failure → rule)",
    ],
  },
  {
    title: "Intelligence Layer",
    items: [
      "Expert Knowledge Copilot (Q&A + citations)",
      "Maintenance RCA Agent (root cause + actions)",
      "Compliance Intelligence Agent (audit gaps)",
    ],
  },
  {
    title: "Output Layer",
    items: [
      "Prioritized corrective action queues",
      "Source-cited answers with confidence scores",
      "Audit-ready compliance evidence mapping",
    ],
  },
];

export default function ArchitecturePage() {
  return (
    <div>
      <PageHeader
        title="System Architecture"
        description="OpsMind architecture for PS-8: unified industrial knowledge ingestion, retrieval, and agentic intelligence."
        badge="Submission-ready diagram"
      />

      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          {[
            "Heterogeneous Plant Documents",
            "↓",
            "Ingestion · Chunking · Tagging",
            "↓",
            "Local RAG Retrieval + Knowledge Graph",
            "↓",
            "Copilot · RCA Agent · Compliance Agent",
            "↓",
            "Cited Answers · Action Queues · Audit Gaps",
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
            "Local RAG",
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
      </section>
    </div>
  );
}
