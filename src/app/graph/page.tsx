"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

interface GraphNode {
  id: string;
  label: string;
  type: "equipment" | "regulation" | "document" | "failure";
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  source?: string;
}

const nodeColors: Record<GraphNode["type"], string> = {
  equipment: "#22d3ee",
  regulation: "#fbbf24",
  document: "#94a3b8",
  failure: "#f87171",
};

function layoutNodes(nodes: GraphNode[], width: number, height: number) {
  const grouped = {
    equipment: nodes.filter((node) => node.type === "equipment"),
    failure: nodes.filter((node) => node.type === "failure"),
    regulation: nodes.filter((node) => node.type === "regulation"),
    document: nodes.filter((node) => node.type === "document"),
  };

  const positions = new Map<string, { x: number; y: number }>();
  const columns = [
    { key: "equipment", x: width * 0.15 },
    { key: "failure", x: width * 0.38 },
    { key: "document", x: width * 0.62 },
    { key: "regulation", x: width * 0.85 },
  ] as const;

  for (const column of columns) {
    const list = grouped[column.key];
    list.forEach((node, index) => {
      const spacing = height / (list.length + 1);
      positions.set(node.id, {
        x: column.x,
        y: spacing * (index + 1),
      });
    });
  }

  return positions;
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/documents")
      .then((response) => response.json())
      .then((data) => {
        setNodes(data.graph?.nodes ?? []);
        setEdges(data.graph?.edges ?? []);
        setLoading(false);
      });
  }, []);

  const filteredEdges = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return edges.slice(0, 40);
    return edges
      .filter((edge) => {
        const fromNode = nodes.find((node) => node.id === edge.from);
        const toNode = nodes.find((node) => node.id === edge.to);
        return (
          fromNode?.label.toLowerCase().includes(q) ||
          toNode?.label.toLowerCase().includes(q) ||
          edge.relation.includes(q)
        );
      })
      .slice(0, 40);
  }, [edges, nodes, filter]);

  const activeNodeIds = new Set<string>();
  for (const edge of filteredEdges) {
    activeNodeIds.add(edge.from);
    activeNodeIds.add(edge.to);
  }

  const visibleNodes = nodes.filter((node) => activeNodeIds.has(node.id));
  const positions = layoutNodes(visibleNodes, 900, 520);

  return (
    <div>
      <PageHeader
        title="Industrial Knowledge Graph"
        description="Equipment tags, failure modes, plant documents, and regulatory references linked from ingested records — built from metadata and entity extraction."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter graph by equipment tag (e.g. P-101, AC-07)..."
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
        />
        <Link
          href="/documents"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Upload more documents →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(nodeColors).map(([type, color]) => (
          <span key={type} className="inline-flex items-center gap-2 text-slate-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {type}
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Building knowledge graph...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <svg viewBox="0 0 900 520" className="min-w-[900px] w-full">
              {filteredEdges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                return (
                  <g key={edge.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#334155"
                      strokeWidth="1.5"
                      markerEnd="url(#arrow)"
                    />
                  </g>
                );
              })}

              <defs>
                <marker
                  id="arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
                </marker>
              </defs>

              {visibleNodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                const label =
                  node.label.length > 28
                    ? `${node.label.slice(0, 28)}…`
                    : node.label;
                return (
                  <g key={node.id}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="18"
                      fill={nodeColors[node.type]}
                      fillOpacity="0.18"
                      stroke={nodeColors[node.type]}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 34}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="11"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {filteredEdges.slice(0, 12).map((edge) => {
              const fromNode = nodes.find((node) => node.id === edge.from);
              const toNode = nodes.find((node) => node.id === edge.to);
              return (
                <div
                  key={edge.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-200">
                      {fromNode?.label}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">
                      {toNode?.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                    {edge.relation.replaceAll("_", " ")}
                  </p>
                  {edge.source && (
                    <p className="mt-1 text-xs text-slate-400">Source: {edge.source}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
