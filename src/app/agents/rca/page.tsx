"use client";

import { FormEvent, useState } from "react";
import { Loader2, Download, Play } from "lucide-react";
import { CitationList, ConfidenceBadge, KnowledgeGraph, PageHeader } from "@/components/ui";
import type { AgentResult } from "@/lib/types";

export default function RcaAgentPage() {
  const [equipmentTag, setEquipmentTag] = useState("P-101");
  const [symptoms, setSymptoms] = useState(
    "High vibration on drive end bearing and recurring mechanical seal leakage"
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
        body: JSON.stringify({ agent: "rca", equipmentTag, symptoms }),
      });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  function exportActions() {
    if (!result) return;
    const text = [
      `OpsMind RCA Report — ${equipmentTag}`,
      "",
      result.summary,
      "",
      "Recommended Actions:",
      ...result.actions.map(
        (a, i) =>
          `${i + 1}. [${a.priority.toUpperCase()}] ${a.title} — ${a.description} (Owner: ${a.owner}, Due: ${a.dueIn})`
      ),
    ].join("\n");
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
