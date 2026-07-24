export type DocumentType =
  | "SOP"
  | "Work Order"
  | "Inspection"
  | "Regulatory"
  | "Manual"
  | "Incident"
  | "Procedure";

export interface IndustrialDocument {
  id: string;
  title: string;
  type: DocumentType;
  equipmentTags: string[];
  regulatoryRefs: string[];
  content: string;
  lastUpdated: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  equipmentTags: string[];
  regulatoryRefs: string[];
  content: string;
  chunkIndex: number;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  excerpt: string;
  relevanceScore: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: number;
}

export interface AgentAction {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  owner: string;
  dueIn: string;
  citations: Citation[];
}

export interface AgentResult {
  agent: string;
  summary: string;
  confidence: number;
  actions: AgentAction[];
  citations: Citation[];
  knowledgeLinks: KnowledgeLink[];
}

export interface KnowledgeLink {
  from: string;
  relation: string;
  to: string;
  source: string;
}

export interface DashboardStats {
  documentsIndexed: number;
  equipmentNodes: number;
  complianceRules: number;
  graphEdges: number;
  avgQueryTimeMs: number;
}
