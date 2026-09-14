"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { fetchCorpus } from "@/lib/api-client";
import { RELATION_MEANINGS } from "@/lib/relations";

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
  meaning?: string;
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
  const [filter, setFilter] = useState("P-101");
  const [enabledTypes, setEnabledTypes] = useState<GraphNode["type"][]>([
    "equipment",
    "failure",
    "document",
    "regulation",
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGraph = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    fetchCorpus().then((data) => {
      setNodes((data.graph?.nodes ?? []) as GraphNode[]);
      setEdges(data.graph?.edges ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadGraph(true);

    function refresh() {
      loadGraph(false);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") refresh();
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadGraph]);

  const filteredEdges = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return edges.filter((edge) => {
      const fromNode = nodes.find((node) => node.id === edge.from);
      const toNode = nodes.find((node) => node.id === edge.to);
      if (!fromNode || !toNode) return false;
      if (!enabledTypes.includes(fromNode.type) || !enabledTypes.includes(toNode.type)) {
        return false;
      }
      if (!q) return true;
      return (
        fromNode.label.toLowerCase().includes(q) ||
        toNode.label.toLowerCase().includes(q) ||
        edge.relation.includes(q)
      );
    });
  }, [edges, nodes, filter, enabledTypes]);

  const visibleEdges = filteredEdges.slice(0, 80);
  const activeNodeIds = new Set<string>();
  for (const edge of visibleEdges) {
    activeNodeIds.add(edge.from);
    activeNodeIds.add(edge.to);
  }
  const visibleNodes = nodes.filter((node) => activeNodeIds.has(node.id));
  const height = Math.max(520, visibleNodes.length * 22);
  const positions = layoutNodes(visibleNodes, 900, height);
  const selected = nodes.find((node) => node.id === selectedId);
  const selectedEdges = edges.filter(
    (edge) => edge.from === selectedId || edge.to === selectedId
  );

  function toggleType(type: GraphNode["type"]) {
    setEnabledTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  }

  return (
    <div>
      <PageHeader
        title="Industrial Knowledge Graph"
        description="Equipment, failure modes, plant documents, and regulations linked from ingested records. Upload a file on Documents and refresh here — session uploads update the graph immediately."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by tag, document, or relation..."
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={() => setFilter("")}
          className="text-xs text-slate-400 hover:text-white"
        >
          Show all
        </button>
        <button
          type="button"
          onClick={() => loadGraph(true)}
          className="text-xs text-slate-400 hover:text-white"
        >
          Refresh graph
        </button>
        <Link href="/documents" className="text-xs text-cyan-400 hover:text-cyan-300">
          Upload a record to update this graph →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(nodeColors) as GraphNode["type"][]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              enabledTypes.includes(type)
                ? "border-cyan-500/40 text-slate-200"
                : "border-slate-800 text-slate-600"
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: nodeColors[type] }}
            />
            {type}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400 md:grid-cols-2">
        {Object.entries(RELATION_MEANINGS).map(([relation, meaning]) => (
          <p key={relation}>
            <span className="uppercase tracking-wide text-cyan-400">
              {relation.replaceAll("_", " ")}
            </span>
            {" — "}
            {meaning}
          </p>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Building knowledge graph...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <svg viewBox={`0 0 900 ${height}`} className="min-w-[900px] w-full">
              {visibleEdges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#334155"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow)"
                  />
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
                  node.label.length > 28 ? `${node.label.slice(0, 28)}…` : node.label;
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(node.id)}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={selectedId === node.id ? 20 : 16}
                      fill={nodeColors[node.type]}
                      fillOpacity="0.18"
                      stroke={nodeColors[node.type]}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 32}
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

          {selected && (
            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-400">
                {selected.type}
              </p>
              <h2 className="mt-1 text-lg text-white">{selected.label}</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                {selectedEdges.slice(0, 8).map((edge) => {
                  const fromNode = nodes.find((node) => node.id === edge.from);
                  const toNode = nodes.find((node) => node.id === edge.to);
                  return (
                    <p key={edge.id}>
                      {fromNode?.label} → {toNode?.label}{" "}
                      <span className="text-slate-500">
                        ({edge.relation.replaceAll("_", " ")})
                      </span>
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {visibleEdges.slice(0, 12).map((edge) => {
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
                  <p className="mt-1 text-xs text-slate-400">
                    {edge.meaning ?? RELATION_MEANINGS[edge.relation]}
                  </p>
                  {edge.source && (
                    <p className="mt-1 text-xs text-slate-500">Source: {edge.source}</p>
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
