import { AnalysisResult } from '../entities/AnalysisResult';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrchestratorResponse {
  response: string;
  route: string;
}

export interface IOrchestratorClient {
  chat(
    analysisContext: AnalysisResult | null,
    question: string,
    history: ConversationMessage[]
  ): Promise<OrchestratorResponse>;
}
