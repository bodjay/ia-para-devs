import { Logger } from '@arch-analyzer/common';
import { AnalysisResult } from '../../domain/entities/AnalysisResult';
import {
  ConversationMessage,
  IOrchestratorClient,
  OrchestratorResponse,
} from '../../domain/services/IOrchestratorClient';

const logger = new Logger('orchestrator-client');

export class OrchestratorClient implements IOrchestratorClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ORCHESTRATOR_URL ?? 'http://localhost:3005';
  }

  async chat(
    analysisContext: AnalysisResult | null,
    question: string,
    history: ConversationMessage[]
  ): Promise<OrchestratorResponse> {
    logger.info('Forwarding chat to orchestrator', { hasContext: !!analysisContext });

    const response = await fetch(`${this.baseUrl}/analysis/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        analysisContext: analysisContext ? this.toCompact(analysisContext) : null,
        history,
      }),
      signal: AbortSignal.timeout(130_000),
    });

    if (!response.ok) {
      logger.error('Orchestrator returned non-OK status', { status: response.status });
      throw new Error(`Orchestrator error: ${response.status}`);
    }

    const result = await response.json() as OrchestratorResponse;
    logger.info('Orchestrator response received', { route: result.route });
    return result;
  }

  private toCompact(ctx: AnalysisResult) {
    return {
      summary: ctx.summary,
      components: ctx.components.map((c) => ({
        name: c.name,
        type: c.type,
        description: c.description,
      })),
      risks: ctx.risks.map((r) => ({
        title: r.title,
        severity: r.severity,
        description: r.description,
      })),
      recommendations: ctx.recommendations.map((r) => ({
        title: r.title,
        priority: r.priority,
        description: r.description,
      })),
    };
  }
}
