"use client";

import { FormEvent, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { CitationList, ConfidenceBadge, KnowledgeGraph, PageHeader } from "@/components/ui";
import type { AgentResult } from "@/lib/types";

export default function ComplianceAgentPage() {
  const [scope, setScope] = useState(
    "Unit-2 maintenance records, permit-to-work, and safety inspections"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);

  async function runAgent(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "compliance", scope }),
      });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Compliance Intelligence Agent"
        description="Maps Factory Act, OISD, and PESO requirements against current procedures, equipment states, and inspection records to surface audit gaps before they escalate."
      />

      <form
        onSubmit={runAgent}
        className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Audit Scope
          </span>
          <textarea
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Compliance Agent
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium text-white">Compliance Summary</h2>
              <ConfidenceBadge score={result.confidence} />
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
            <CitationList citations={result.citations} />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-medium text-white">Regulatory Gap Map</h2>
            <KnowledgeGraph links={result.knowledgeLinks} />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-medium text-white">Corrective Action Queue</h2>
            <div className="mt-4 space-y-4">
              {result.actions.map((action) => (
                <div
                  key={action.title}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase ${
                        action.priority === "critical"
                          ? "bg-red-500/10 text-red-300"
                          : action.priority === "high"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {action.priority}
                    </span>
                    <h3 className="text-sm font-medium text-white">{action.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {action.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Owner: {action.owner} · Due in {action.dueIn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
