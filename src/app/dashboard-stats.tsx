"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui";
import { fetchCorpus } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/types";

/**
 * The home page is statically prerendered, so server-computed stats would be
 * frozen at build time and would never include this browser's uploads. Render
 * the seed numbers immediately, then refresh against the live session corpus.
 */
export function DashboardStatCards({ initial }: { initial: DashboardStats }) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    fetchCorpus()
      .then((data) => {
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Documents Indexed"
        value={stats.documentsIndexed}
        hint="Seed corpus plus this browser's uploads"
      />
      <StatCard
        label="Asset Tags"
        value={stats.assetTags}
        hint="Plant tags such as P-101 extracted from records"
      />
      <StatCard
        label="Knowledge Graph Edges"
        value={stats.graphEdges}
        hint="Equipment, document, regulation, and failure links"
      />
      <StatCard
        label="Regulations Mapped"
        value={stats.complianceRules}
        hint="Distinct statutory references found in the corpus"
      />
    </div>
  );
}
