"use client";

import { FormEvent, useState } from "react";
import { Loader2, Download, Play } from "lucide-react";
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

export default function RcaAgentPage() {
  const [equipmentTag, setEquipmentTag] = useState("P-101");
  const [symptoms, setSymptoms] = useState(
    "High vibration on drive end bearing and recurring mechanical seal leakage"
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
        body: JSON.stringify(
          withSessionDocuments({ agent: "rca", equipmentTag, symptoms })
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(String(data.error ?? "RCA request failed"));
        return;
      }
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  function exportActions() {
    if (!result) return;
    const text = formatAgentReport(result, {
      title: `OpsMind RCA Report — ${equipmentTag}`,
      equipmentTag,
      symptoms,
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `opsmind-rca-${equipmentTag}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Maintenance RCA Agent"
        description="Fuses work order history, inspection findings, OEM manuals, and operating conditions to produce root cause analysis and prioritized corrective actions."
      />

      <form
        onSubmit={runAgent}
        className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-2"
      >
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Equipment Tag
          </span>
          <input
            value={equipmentTag}
            onChange={(event) => setEquipmentTag(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Observed Symptoms
          </span>
          <textarea
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 md:col-span-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run RCA Agent
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
              <h2 className="text-lg font-medium text-white">Analysis Summary</h2>
              <ConfidenceBadge score={result.confidence} />
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
            <CitationList citations={result.citations} />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-medium text-white">Knowledge Graph Links</h2>
            <KnowledgeGraph links={result.knowledgeLinks} />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-white">Recommended Actions</h2>
              <button
                type="button"
                onClick={exportActions}
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
