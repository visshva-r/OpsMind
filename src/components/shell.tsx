export function DemoBanner() {
  return (
    <div className="border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-center text-xs text-cyan-200">
      Demo corpus · Unit-2 cooling water (P-101) and compressor AC-07
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
      OpsMind — Industrial Knowledge Intelligence
    </footer>
  );
}

export function ChatSkeleton() {
  return (
    <div className="mr-8 animate-pulse space-y-3 rounded-lg bg-slate-950/80 p-4">
      <div className="h-3 w-32 rounded bg-slate-800" />
      <div className="h-3 w-full rounded bg-slate-800" />
      <div className="h-3 w-5/6 rounded bg-slate-800" />
      <div className="h-3 w-4/6 rounded bg-slate-800" />
    </div>
  );
}
