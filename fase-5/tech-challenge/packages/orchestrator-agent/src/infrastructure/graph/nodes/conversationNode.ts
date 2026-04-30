import { OllamaClient } from '../../ai/OllamaClient';
import { Logger } from '@arch-analyzer/common';
import { GraphStateType } from '../state';
import { CompactComponent } from '../../../domain/entities/OrchestratorState';

const MAX_HISTORY = 6;
const logger = new Logger('conversation-node');

function buildSystemPrompt(summary: string, components: CompactComponent[]): string {
  const lines = components.map((c) => `- ${c.name}(${c.type}): ${c.description}`).join('\n');
  return `You are an expert software architecture assistant. Answer questions about the diagram below.
/no_think

# Architecture
${summary}

## Components
${lines}

Answer concisely and technically in pt-BR.`;
}

export function createConversationNode(ollama: OllamaClient) {
  return async function conversationNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    const ctx = state.analysisContext!;
    logger.info('Generating conversation response', { components: ctx.components.length });

    const system = buildSystemPrompt(ctx.summary, ctx.components);
    const recentHistory = state.history.slice(-MAX_HISTORY);

    const response = await ollama.chat([
      { role: 'system', content: system },
      ...recentHistory,
      { role: 'user', content: state.question },
    ]);

    return { response };
  };
}
