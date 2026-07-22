import Link from "next/link";
import { ArrowRight, Bot, Brain, Play, ShieldCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui";
import { getDashboardStats } from "@/lib/agents";
import { getAllDocuments } from "@/lib/rag";

const equipmentTags = ["P-101", "AC-07", "V-220", "CT-02", "B-401"];

export default function HomePage() {
  const stats = getDashboardStats();
  const documents = getAllDocuments();

  return (
    <div>
      <section className="mb-8 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-slate-950 p-6">
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          ET AI Hackathon 2026 · Problem Statement 8
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Turning 7–12 disconnected plant systems into one queryable brain
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          OpsMind unifies SOPs, work orders, inspection reports, OEM manuals, and
          regulatory documents into a single AI intelligence layer for maintenance,
          safety, and compliance teams.
        </p>
        <Link
          href="/copilot?q=Why+is+pump+P-101+experiencing+repeat+seal+failures%3F"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          <Play className="h-4 w-4" />
          Start Live Demo
        </Link>
      </section>

      <PageHeader
        title="Unified Asset & Operations Brain"
        description="Real-time knowledge retrieval, root cause analysis, and compliance intelligence across heterogeneous industrial records."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents Indexed"
          value={stats.documentsIndexed}
          hint="Heterogeneous industrial records unified"
        />
        <StatCard
          label="Knowledge Graph Nodes"
          value={stats.equipmentNodes}
          hint="Equipment, permits, and risk relationships"
        />
        <StatCard
          label="Compliance Rules"
          value={stats.complianceRules}
          hint="Mapped to OISD, Factory Act, and PESO"
        />
        <StatCard
          label="Avg Query Time"
          value={`${stats.avgQueryTimeMs} ms`}
          hint="Local RAG retrieval with source citations"
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <span className="text-xs text-slate-500">Equipment tags:</span>
        {equipmentTags.map((tag) => (
          <Link
            key={tag}
            href={`/documents?tag=${encodeURIComponent(tag)}`}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-cyan-300 hover:border-cyan-500/50"
          >
            {tag}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <FeatureCard
          href="/copilot"
          icon={Bot}
          title="Expert Knowledge Copilot"
          description="Ask operational and maintenance questions across the full document corpus with confidence scores and citations."
        />
        <FeatureCard
          href="/agents/rca"
          icon={Brain}
          title="Maintenance RCA Agent"
          description="Connect work order history, inspection findings, and OEM guidance to generate root cause actions."
        />
        <FeatureCard
          href="/agents/compliance"
          icon={ShieldCheck}
          title="Compliance Intelligence Agent"
          description="Detect audit gaps by mapping regulatory requirements to current procedures and records."
        />
      </div>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">Indexed Document Corpus</h2>
          <Link href="/architecture" className="text-xs text-cyan-400 hover:text-cyan-300">
            View architecture →
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Demo corpus includes {documents.length} industrial records across SOPs,
          work orders, inspections, incidents, and regulatory excerpts.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {documents.slice(0, 6).map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-4"
            >
              <p className="text-sm font-medium text-white">{doc.title}</p>
              <p className="mt-1 text-xs text-cyan-400">{doc.type}</p>
              <p className="mt-2 text-xs text-slate-500">
                Tags: {doc.equipmentTags.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Bot;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900"
    >
      <Icon className="h-5 w-5 text-cyan-400" />
      <h3 className="mt-4 text-lg font-medium text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">
        Open
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
