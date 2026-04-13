export type RouteType = 'chat' | 'risk_analysis' | 'recommendations' | 'no_analysis';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompactComponent {
  name: string;
  type: string;
  description: string;
}

export interface CompactRisk {
  title: string;
  severity: string;
  description: string;
}

export interface CompactRecommendation {
  title: string;
  priority: string;
  description: string;
}

export interface CompactAnalysis {
  summary: string;
  components: CompactComponent[];
  risks: CompactRisk[];
  recommendations: CompactRecommendation[];
}

export interface OrchestratorInput {
  question: string;
  analysisContext: CompactAnalysis | null;
  history: ConversationMessage[];
}

export interface OrchestratorOutput {
  response: string;
  route: RouteType;
}
