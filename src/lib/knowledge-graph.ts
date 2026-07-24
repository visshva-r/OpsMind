import { getAllStoredDocuments } from "./document-store";

export type GraphNodeType = "equipment" | "regulation" | "document" | "failure";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  source?: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const FAILURE_KEYWORDS = [
  { keyword: "seal", label: "Mechanical Seal Failure" },
  { keyword: "vibration", label: "Vibration Excursion" },
  { keyword: "temperature", label: "Temperature Alarm" },
  { keyword: "leak", label: "Leakage Event" },
  { keyword: "permit", label: "Permit Violation" },
];

function nodeId(type: GraphNodeType, label: string): string {
  return `${type}:${label.toLowerCase().replace(/\s+/g, "-")}`;
}

export function buildKnowledgeGraph(): KnowledgeGraphData {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const documents = getAllStoredDocuments();

  for (const doc of documents) {
    const docNodeId = nodeId("document", doc.id);
    nodes.set(docNodeId, {
      id: docNodeId,
      label: doc.title,
      type: "document",
    });

    for (const tag of doc.equipmentTags) {
      const equipmentId = nodeId("equipment", tag);
      if (!nodes.has(equipmentId)) {
        nodes.set(equipmentId, { id: equipmentId, label: tag, type: "equipment" });
      }
      edges.push({
        id: `${equipmentId}->${docNodeId}`,
        from: equipmentId,
        to: docNodeId,
        relation: "documented_in",
        source: doc.title,
      });
    }

    for (const ref of doc.regulatoryRefs) {
      const regId = nodeId("regulation", ref);
      if (!nodes.has(regId)) {
        nodes.set(regId, { id: regId, label: ref, type: "regulation" });
      }
      edges.push({
        id: `${docNodeId}->${regId}`,
        from: docNodeId,
        to: regId,
        relation: "cites_regulation",
        source: doc.title,
      });

      for (const tag of doc.equipmentTags) {
        const equipmentId = nodeId("equipment", tag);
        edges.push({
          id: `${equipmentId}->${regId}`,
          from: equipmentId,
          to: regId,
          relation: "governed_by",
          source: doc.title,
        });
      }
    }

    const lowerContent = doc.content.toLowerCase();
    for (const failure of FAILURE_KEYWORDS) {
      if (!lowerContent.includes(failure.keyword)) continue;

      const failureId = nodeId("failure", failure.label);
      if (!nodes.has(failureId)) {
        nodes.set(failureId, {
          id: failureId,
          label: failure.label,
          type: "failure",
        });
      }

      for (const tag of doc.equipmentTags) {
        const equipmentId = nodeId("equipment", tag);
        edges.push({
          id: `${equipmentId}->${failureId}`,
          from: equipmentId,
          to: failureId,
          relation: "has_failure_mode",
          source: doc.title,
        });
      }
    }
  }

  const uniqueEdges = edges.filter(
    (edge, index, list) =>
      list.findIndex((item) => item.from === edge.from && item.to === edge.to && item.relation === edge.relation) === index
  );

  return {
    nodes: [...nodes.values()],
    edges: uniqueEdges,
  };
}

export function getGraphLinksForEquipment(equipmentTag: string, limit = 6) {
  const graph = buildKnowledgeGraph();
  const equipmentId = nodeId("equipment", equipmentTag.toUpperCase());

  return graph.edges
    .filter((edge) => edge.from === equipmentId || edge.to === equipmentId)
    .slice(0, limit)
    .map((edge) => {
      const fromNode = graph.nodes.find((node) => node.id === edge.from);
      const toNode = graph.nodes.find((node) => node.id === edge.to);
      return {
        from: fromNode?.label ?? equipmentTag,
        relation: edge.relation,
        to: toNode?.label ?? "Unknown",
        source: edge.source ?? "Knowledge Graph",
      };
    });
}

export function getGraphStats() {
  const graph = buildKnowledgeGraph();
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    equipmentNodes: graph.nodes.filter((node) => node.type === "equipment").length,
    regulationNodes: graph.nodes.filter((node) => node.type === "regulation").length,
    documentNodes: graph.nodes.filter((node) => node.type === "document").length,
  };
}
