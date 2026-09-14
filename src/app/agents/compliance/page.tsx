"use client";

import { FormEvent, useState } from "react";
import { Download, Loader2, Play } from "lucide-react";
import {
  ActionCard,
  CitationList,
  ConfidenceBadge,
  KnowledgeGraph,
  PageHeader,
} from "@/components/ui";
import { withSessionDocuments } from "@/lib/api-client";
import { formatAgentReport } from "@/lib/export-report";
import type { AgentResult } from "@/lib/types";

export default function ComplianceAgentPage() {
  const [scope, setScope] = useState(
    "Unit-2 Factory Act maintenance records and vibration alarm investigations"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAgent(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withSessionDocuments({ agent: "compliance", scope })),
      });
      const data = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(String(data.error ?? "Compliance request failed"));
        return;
      }
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

      {error && (
        <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      )}

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-white">Corrective Action Queue</h2>
              <button
                type="button"
                onClick={() => {
                  const text = formatAgentReport(result, {
                    title: "OpsMind Compliance Report",
                    scope,
                  });
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "opsmind-compliance-report.txt";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-white"
              >
                <Download className="h-3 w-3" />
                Export Report
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {result.actions.map((action) => (
                <ActionCard key={action.title} action={action} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
