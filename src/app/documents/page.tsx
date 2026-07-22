"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SEED_DOCUMENTS } from "@/lib/seed-documents";
import type { DocumentType } from "@/lib/types";

const types: Array<DocumentType | "All"> = [
  "All",
  "SOP",
  "Work Order",
  "Inspection",
  "Regulatory",
  "Manual",
  "Incident",
  "Procedure",
];

function DocumentsContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag") ?? "";
  const [search, setSearch] = useState(initialTag);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "All">("All");
  const [toast, setToast] = useState<string | null>(null);
  const [docCount, setDocCount] = useState(SEED_DOCUMENTS.length);

  const documents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SEED_DOCUMENTS.filter((doc) => {
      const matchesType = typeFilter === "All" || doc.type === typeFilter;
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q) ||
        doc.equipmentTags.some((tag) => tag.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [search, typeFilter]);

  function handleUpload() {
    setDocCount((c) => c + 1);
    setToast("Document indexed successfully — added to knowledge graph (demo).");
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div>
      <PageHeader
        title="Universal Document Ingestion"
        description="Heterogeneous industrial documents unified into a searchable knowledge layer with equipment tags, regulatory references, and entity relationships."
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <button
          type="button"
          onClick={handleUpload}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
        >
          <Upload className="h-4 w-4" />
          Upload Document (Demo)
        </button>
        <span className="text-xs text-slate-500">
          {docCount} documents in knowledge base
        </span>
      </div>

      <div className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, content, or equipment tag (e.g. P-101, AC-07)..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
        />
        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`rounded-full border px-3 py-1 text-xs ${
                typeFilter === type
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                  : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Showing {documents.length} of {SEED_DOCUMENTS.length} documents
        </p>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <article
            key={doc.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-white">{doc.title}</h2>
                <p className="mt-1 text-xs uppercase tracking-wide text-cyan-400">
                  {doc.type}
                </p>
              </div>
              <p className="text-xs text-slate-500">Updated {doc.lastUpdated}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {doc.equipmentTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            {doc.regulatoryRefs.length > 0 && (
              <p className="mt-3 text-xs text-amber-300/90">
                Regulatory: {doc.regulatoryRefs.join(", ")}
              </p>
            )}

            <p className="mt-4 text-sm leading-7 text-slate-400">{doc.content}</p>
          </article>
        ))}
        {documents.length === 0 && (
          <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-500">
            No documents match your search or filter.
          </p>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Loading documents...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
