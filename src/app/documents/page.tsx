"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { fetchCorpus } from "@/lib/api-client";
import { findAnchor } from "@/lib/citation";
import { clearSessionDocuments, saveSessionDocument } from "@/lib/client-store";
import type { DocumentType, IndustrialDocument } from "@/lib/types";

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

/** Renders the full record with the cited passage marked, not a re-truncated window. */
function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) return text;
  const match = findAnchor(text, highlight);
  if (!match) return text;

  return (
    <>
      {text.slice(0, match.index)}
      <mark className="rounded bg-cyan-500/20 px-1 text-cyan-100">
        {text.slice(match.index, match.index + match.length)}
      </mark>
      {text.slice(match.index + match.length)}
    </>
  );
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag") ?? "";
  const focusId = searchParams.get("id");
  const highlight = searchParams.get("highlight") ?? "";
  const [documents, setDocuments] = useState<IndustrialDocument[]>([]);
  const [search, setSearch] = useState(initialTag);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "All">("All");
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const focusRef = useRef<HTMLElement | null>(null);

  async function loadDocuments() {
    const data = await fetchCorpus();
    setDocuments(data.documents);
    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, documents]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesType = typeFilter === "All" || doc.type === typeFilter;
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q) ||
        doc.equipmentTags.some((tag) => tag.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [documents, search, typeFilter]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setToast(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setToast(data.error ?? "Upload failed");
        return;
      }

      if (!saveSessionDocument(data.document)) {
        setToast(
          "Upload parsed but could not be saved — this browser's storage is full. Clear session uploads and try again."
        );
        return;
      }

      await loadDocuments();
      setToast(
        `Indexed "${data.document.title}" — ${data.document.equipmentTags.length} equipment tags extracted. It is queryable in Copilot and the knowledge graph now.`
      );
    } catch {
      setToast("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
      setTimeout(() => setToast(null), 6000);
    }
  }

  function handleClearUploads() {
    clearSessionDocuments();
    loadDocuments();
    setToast("Cleared browser-session uploads. Seed corpus is unchanged.");
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div>
      <PageHeader
        title="Document Ingestion"
        description="Upload .txt, .md, .csv, or .json plant records. OpsMind extracts equipment tags and regulations, then makes the file queryable in Copilot and visible on the knowledge graph. Uploads persist in this browser session so they work on serverless hosts."
      />

      {toast && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            toast.toLowerCase().includes("fail")
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20">
          <Upload className="h-4 w-4" />
          {uploading ? "Indexing..." : "Upload .txt / .md / .csv / .json"}
          <input
            type="file"
            accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
        <span className="text-xs text-slate-500">
          {documents.length} documents in knowledge base
          {documents.some((doc) => doc.id.startsWith("upload-")) &&
            " · includes session uploads"}
        </span>
        {documents.some((doc) => doc.id.startsWith("upload-")) && (
          <button
            type="button"
            onClick={handleClearUploads}
            className="text-xs text-slate-400 underline hover:text-white"
          >
            Clear session uploads
          </button>
        )}
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
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading documents...</p>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => {
            const isFocused = focusId === doc.id;
            return (
              <article
                key={doc.id}
                id={doc.id}
                ref={isFocused ? focusRef : undefined}
                className={`rounded-xl border bg-slate-900/60 p-5 ${
                  isFocused
                    ? "border-cyan-500/50 ring-1 ring-cyan-500/20"
                    : "border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium text-white">{doc.title}</h2>
                    <p className="mt-1 text-xs uppercase tracking-wide text-cyan-400">
                      {doc.type}
                      {doc.id.startsWith("upload-") && " · Session upload"}
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

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                  {isFocused && highlight
                    ? highlightText(doc.content, highlight)
                    : doc.content}
                </p>
              </article>
            );
          })}
          {filteredDocuments.length === 0 && (
            <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-500">
              No documents match your search or filter.
            </p>
          )}
        </div>
      )}
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
