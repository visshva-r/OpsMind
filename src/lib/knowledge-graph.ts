import { getAllStoredDocuments, isAssetTag, isFailureHostTag } from "./document-store";
import { RELATION_MEANINGS } from "./relations";
import type { IndustrialDocument } from "./types";

export { RELATION_MEANINGS };

export type GraphNodeType = "equipment" | "regulation" | "document" | "failure";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  /** True when the label is a plant tag (P-101) rather than a descriptor. */
  assetTag?: boolean;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  source?: string;
  meaning?: string;
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
  { keyword: "alignment", label: "Misalignment" },
  { keyword: "intercooler", label: "Intercooler Drain Overdue" },
  { keyword: "certificate", label: "Certificate Expiry" },
];

function nodeId(type: GraphNodeType, label: string): string {
  return `${type}:${label.toLowerCase().replace(/\s+/g, "-")}`;
}

/**
 * One request can build the graph three times (stats, graph payload, agent
 * links). Memoising on the corpus signature keeps that to a single pass without
 * introducing state that outlives the data it describes.
 */
let cache: { signature: string; data: KnowledgeGraphData } | null = null;

function signatureOf(documents: IndustrialDocument[]): string {
  return documents.map((doc) => `${doc.id}:${doc.content.length}`).join("|");
}

export function buildKnowledgeGraph(
  sessionDocuments: IndustrialDocument[] = []
): KnowledgeGraphData {
  const documents = getAllStoredDocuments(sessionDocuments);
  const signature = signatureOf(documents);
  if (cache?.signature === signature) return cache.data;

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const addEdge = (edge: GraphEdge) => {
    if (!edges.has(edge.id)) edges.set(edge.id, edge);
  };

  for (const doc of documents) {
    const docNodeId = nodeId("document", doc.id);
    nodes.set(docNodeId, { id: docNodeId, label: doc.title, type: "document" });

    const equipmentIds = doc.equipmentTags.map((tag) => {
      const id = nodeId("equipment", tag);
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          label: tag,
          type: "equipment",
          assetTag: isAssetTag(tag),
        });
      }
      return id;
    });

    for (const equipmentId of equipmentIds) {
      addEdge({
        id: `${equipmentId}->${docNodeId}`,
        from: equipmentId,
        to: docNodeId,
        relation: "documented_in",
        source: doc.title,
        meaning: RELATION_MEANINGS.documented_in,
      });
    }

    for (const ref of doc.regulatoryRefs) {
      const regId = nodeId("regulation", ref);
      if (!nodes.has(regId)) {
        nodes.set(regId, { id: regId, label: ref, type: "regulation" });
      }

      addEdge({
        id: `${docNodeId}->${regId}`,
        from: docNodeId,
        to: regId,
        relation: "cites_regulation",
        source: doc.title,
        meaning: RELATION_MEANINGS.cites_regulation,
      });

      for (const equipmentId of equipmentIds) {
        addEdge({
          id: `${equipmentId}->${regId}`,
          from: equipmentId,
          to: regId,
          relation: "governed_by",
          source: doc.title,
          meaning: RELATION_MEANINGS.governed_by,
        });
      }
    }

    const failureHosts = doc.equipmentTags.filter(isFailureHostTag);
    const assetEquipmentIds = failureHosts
      .filter(
        (tag) =>
          failureHosts.length === 1 ||
          doc.content.toUpperCase().includes(tag.toUpperCase())
      )
      .map((tag) => nodeId("equipment", tag));

    const lowerContent = doc.content.toLowerCase();
    for (const failure of FAILURE_KEYWORDS) {
      if (!lowerContent.includes(failure.keyword)) continue;
      if (!assetEquipmentIds.length) continue;

      const failureId = nodeId("failure", failure.label);
      if (!nodes.has(failureId)) {
        nodes.set(failureId, {
          id: failureId,
          label: failure.label,
          type: "failure",
        });
      }

      for (const equipmentId of assetEquipmentIds) {
        addEdge({
          id: `${equipmentId}->${failureId}`,
          from: equipmentId,
          to: failureId,
          relation: "has_failure_mode",
          source: doc.title,
          meaning: RELATION_MEANINGS.has_failure_mode,
        });
      }
    }
  }

  const data = { nodes: [...nodes.values()], edges: [...edges.values()] };
  cache = { signature, data };
  return data;
}

export function getGraphLinksForEquipment(
  equipmentTag: string,
  limit = 6,
  sessionDocuments: IndustrialDocument[] = []
) {
  const graph = buildKnowledgeGraph(sessionDocuments);
  const equipmentId = nodeId("equipment", equipmentTag.toUpperCase());
  const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));

  return graph.edges
    .filter((edge) => edge.from === equipmentId || edge.to === equipmentId)
    .slice(0, limit)
    .map((edge) => ({
      from: labels.get(edge.from) ?? equipmentTag,
      relation: edge.relation,
      to: labels.get(edge.to) ?? "Unknown",
      source: edge.source ?? "Knowledge Graph",
    }));
}

export function getGraphStats(sessionDocuments: IndustrialDocument[] = []) {
  const graph = buildKnowledgeGraph(sessionDocuments);
  const equipment = graph.nodes.filter((node) => node.type === "equipment");

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    equipmentNodes: equipment.length,
    /** Only true plant tags — descriptors like "Cooling Water System" excluded. */
    assetTagNodes: equipment.filter((node) => node.assetTag).length,
    regulationNodes: graph.nodes.filter((node) => node.type === "regulation").length,
    documentNodes: graph.nodes.filter((node) => node.type === "document").length,
    failureNodes: graph.nodes.filter((node) => node.type === "failure").length,
  };
}
