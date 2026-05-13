import { OllamaClient } from '../../ai/OllamaClient';
import { Logger } from '@arch-analyzer/common';
import { GraphStateType } from '../state';
import { CompactRecommendation } from '../../../domain/entities/OrchestratorState';

const MAX_HISTORY = 4;
const logger = new Logger('recommendation-node');

function buildSystemPrompt(
  summary: string,
  recommendations: CompactRecommendation[],
  retrievedContext: string[]
): string {
  const lines = recommendations
    .map((r) => `- [${r.priority}] ${r.title}: ${r.description}`)
    .join('\n');
  const ragSection =
    retrievedContext.length > 0
      ? `\n\n## Contexto de Análises Anteriores\n${retrievedContext.map((t) => `- ${t}`).join('\n')}`
      : '';
  return `You are a software architecture advisor. Answer questions about the recommendations below.
/no_think

# Architecture
${summary}

## Recommendations
${lines || 'No recommendations identified yet.'}${ragSection}

Answer concisely and technically in pt-BR.`;
}

export function createRecommendationNode(ollama: OllamaClient) {
  return async function recommendationNode(
    state: GraphStateType
  ): Promise<Partial<GraphStateType>> {
    const ctx = state.analysisContext!;
    logger.info('Generating recommendation response', { recommendations: ctx.recommendations.length });

    const system = buildSystemPrompt(ctx.summary, ctx.recommendations, state.retrievedContext ?? []);
    const recentHistory = state.history.slice(-MAX_HISTORY);

    const response = await ollama.chat([
      { role: 'system', content: system },
      ...recentHistory,
      { role: 'user', content: state.question },
    ]);

    return { response };
  };
}
