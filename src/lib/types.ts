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
  engine?: "local" | "gemini";
  /** True when the client asked for Gemini, even if the reply stayed on local RAG. */
  geminiRequested?: boolean;
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
  /** Plant tags such as P-101, excluding free-text descriptors. */
  assetTags: number;
  complianceRules: number;
  graphEdges: number;
}
