import { OllamaClient } from '../../ai/OllamaClient';
import { Logger } from '@arch-analyzer/common';
import { GraphStateType } from '../state';
import { RouteType } from '../../../domain/entities/OrchestratorState';

const VALID_ROUTES: RouteType[] = ['chat', 'risk_analysis', 'recommendations', 'no_analysis'];
const logger = new Logger('router-node');

const SYSTEM_PROMPT = `You are a question classifier for an architecture analysis assistant.
Classify the user question into exactly one of these categories:
- risk_analysis: questions about risks, failures, vulnerabilities, SPOF, security issues
- recommendations: questions about improvements, best practices, scalability, suggestions
- chat: general questions about the architecture, components, flows, or patterns

Reply with only the category name, no explanation.`;

export function createRouterNode(ollama: OllamaClient) {
  return async function routerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    if (!state.analysisContext) {
      logger.info('No analysis context — routing to no_analysis');
      return { route: 'no_analysis' };
    }

    logger.info('Classifying question intent', { question: state.question });

    const raw = await ollama.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: state.question },
      ],
      ollama.routerTimeoutMs
    );

    const route = raw.trim().toLowerCase() as RouteType;
    const resolved = VALID_ROUTES.includes(route) ? route : 'chat';

    logger.info('Route resolved', { route: resolved, raw });
    return { route: resolved };
  };
}
