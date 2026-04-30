import { END, START, StateGraph } from '@langchain/langgraph';
import { OllamaClient } from '../ai/OllamaClient';
import { GraphState, GraphStateType } from './state';
import { createRouterNode } from './nodes/routerNode';
import { createConversationNode } from './nodes/conversationNode';
import { createRiskNode } from './nodes/riskNode';
import { createRecommendationNode } from './nodes/recommendationNode';
import { RouteType } from '../../domain/entities/OrchestratorState';

function noAnalysisNode(_state: GraphStateType): Partial<GraphStateType> {
  return {
    response:
      'Nenhuma análise disponível. Faça o upload de um diagrama de arquitetura para começar.',
  };
}

function selectRoute(state: GraphStateType): string {
  const routeMap: Record<RouteType, string> = {
    chat: 'conversation',
    risk_analysis: 'risk',
    recommendations: 'recommendation',
    no_analysis: 'no_analysis',
  };
  const route: RouteType = state.route;
  return routeMap[route] ?? 'conversation';
}

export function buildOrchestratorGraph(ollama: OllamaClient = new OllamaClient()) {
  return new StateGraph(GraphState)
    .addNode('router', createRouterNode(ollama))
    .addNode('conversation', createConversationNode(ollama))
    .addNode('risk', createRiskNode(ollama))
    .addNode('recommendation', createRecommendationNode(ollama))
    .addNode('no_analysis', noAnalysisNode)
    .addEdge(START, 'router')
    .addConditionalEdges('router', selectRoute, {
      conversation: 'conversation',
      risk: 'risk',
      recommendation: 'recommendation',
      no_analysis: 'no_analysis',
    })
    .addEdge('conversation', END)
    .addEdge('risk', END)
    .addEdge('recommendation', END)
    .addEdge('no_analysis', END)
    .compile();
}
