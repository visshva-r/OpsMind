import Link from "next/link";
import { citationAnchor } from "@/lib/citation";

export function PageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {badge && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);

  if (pct <= 0) {
    return (
      <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
        No supporting evidence
      </span>
    );
  }

  const style =
    pct >= 75
      ? "bg-emerald-500/10 text-emerald-300"
      : pct >= 55
        ? "bg-cyan-500/10 text-cyan-300"
        : "bg-amber-500/10 text-amber-300";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${style}`}>
      {pct}% retrieval match
    </span>
  );
}

export function ActionCard({
  action,
}: {
  action: {
    priority: string;
    title: string;
    description: string;
    owner: string;
    dueIn: string;
    citations: Array<{ documentTitle: string }>;
  };
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
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
      <p className="mt-2 text-sm leading-6 text-slate-400">{action.description}</p>
      <p className="mt-2 text-xs text-slate-500">
        Owner: {action.owner} · Due in {action.dueIn}
      </p>
      {action.citations.length > 0 ? (
        <p className="mt-1 text-xs text-cyan-400/80">
          Evidence:{" "}
          {action.citations.map((citation) => citation.documentTitle).join("; ")}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-600">
          No citation in the indexed corpus supports this item directly.
        </p>
      )}
    </div>
  );
}

export function CitationList({
  citations,
}: {
  citations: Array<{
    documentId?: string;
    documentTitle: string;
    documentType: string;
    excerpt: string;
    relevanceScore: number;
  }>;
}) {
  if (!citations.length) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">
        Source Citations
      </p>
      {citations.map((citation, index) => (
        <div
          key={`${citation.documentTitle}-${index}`}
          className="rounded-lg border border-slate-800 bg-slate-950/80 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            {citation.documentId ? (
              <Link
                href={`/documents?id=${encodeURIComponent(citation.documentId)}&highlight=${encodeURIComponent(citationAnchor(citation.excerpt))}`}
                className="text-sm font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
              >
                {citation.documentTitle}
              </Link>
            ) : (
              <p className="text-sm font-medium text-white">
                {citation.documentTitle}
              </p>
            )}
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">
              {Math.round(citation.relevanceScore * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-500/70"
              style={{ width: `${Math.round(citation.relevanceScore * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{citation.documentType}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {citation.excerpt}
          </p>
        </div>
      ))}
    </div>
  );
}

export function KnowledgeGraph({
  links,
}: {
  links: Array<{
    from: string;
    relation: string;
    to: string;
    source: string;
  }>;
}) {
  if (!links.length) {
    return (
      <p className="text-sm text-slate-500">
        No knowledge graph links found for this query.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {links.map((link, index) => (
        <div key={`${link.from}-${index}`} className="relative pl-6">
          {index < links.length - 1 && (
            <div className="absolute bottom-0 left-2 top-8 w-px bg-cyan-500/30" />
          )}
          <div className="absolute left-0 top-2 h-4 w-4 rounded-full border-2 border-cyan-400 bg-slate-950" />
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-200">
                {link.from}
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">
                {link.to}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
              {link.relation.replaceAll("_", " ")}
            </p>
            <p className="mt-1 text-xs text-slate-400">Source: {link.source}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
