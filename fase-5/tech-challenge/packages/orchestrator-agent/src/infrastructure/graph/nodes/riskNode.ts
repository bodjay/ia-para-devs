import { OllamaClient } from '../../ai/OllamaClient';
import { Logger } from '@arch-analyzer/common';
import { GraphStateType } from '../state';
import { CompactRisk } from '../../../domain/entities/OrchestratorState';

const MAX_HISTORY = 4;
const logger = new Logger('risk-node');

function buildSystemPrompt(
  summary: string,
  risks: CompactRisk[],
  retrievedContext: string[]
): string {
  const lines = risks.map((r) => `- [${r.severity}] ${r.title}: ${r.description}`).join('\n');
  const ragSection =
    retrievedContext.length > 0
      ? `\n\n## Contexto de Análises Anteriores\n${retrievedContext.map((t) => `- ${t}`).join('\n')}`
      : '';
  return `You are a software architecture security and reliability expert. Answer questions about the risks below.
/no_think

# Architecture
${summary}

## Identified Risks
${lines || 'No risks identified yet.'}${ragSection}

Answer concisely and technically in pt-BR.`;
}

export function createRiskNode(ollama: OllamaClient) {
  return async function riskNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const ctx = state.analysisContext!;
    logger.info('Generating risk analysis response', { risks: ctx.risks.length });

    const system = buildSystemPrompt(ctx.summary, ctx.risks, state.retrievedContext ?? []);
    const recentHistory = state.history.slice(-MAX_HISTORY);

    const response = await ollama.chat([
      { role: 'system', content: system },
      ...recentHistory,
      { role: 'user', content: state.question },
    ]);

    return { response };
  };
}
