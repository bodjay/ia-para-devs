import { AnalysisResult } from '../entities/AnalysisResult';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IConversationClient {
  chat(
    analysisContext: AnalysisResult,
    question: string,
    history: ConversationMessage[]
  ): Promise<string>;
}
