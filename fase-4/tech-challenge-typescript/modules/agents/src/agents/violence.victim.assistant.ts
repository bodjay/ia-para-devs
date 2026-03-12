import { ChatOllama } from "@langchain/ollama";
import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import WomansCareKnowledgeTool from "../tools/womans.care.knowledge.tool.js";

const llm = new ChatOllama({ model: "qwen2.5:0.5b", temperature: 0.2 });

/**
 * @description Agente especializado na triagem de vítimas de violência doméstica e de gênero.
 *
 * Detecta padrões vocais e textuais indicativos de trauma, medo e sofrimento emocional
 * relacionados a situações de abuso. Opera com máxima sensibilidade e confidencialidade,
 * apresentando apenas indicadores — nunca conclusões — para não comprometer a segurança
 * da paciente ou o processo de atendimento.
 *
 * Enriquece a análise via RAG (WomansCareKnowledgeTool) consultando a base de conhecimento
 * em saúde mental e violência contra a mulher.
 *
 * Prompt template: ChatML (Qwen2.5) com seções XML estruturadas.
 *
 * @param state Estado atual com `summary`, `sentiment` e `results` acumulados.
 * @returns `{ results: [{ source: "violence_victim", result: string }] }`
 *
 * @example
 * ```ts
 * const result = await ViolenceVictimAssistant({
 *   summary: "Paciente hesita ao responder perguntas sobre sua relação. Apresenta hematomas e choro contido.",
 *   sentiment: { Sentiment: "NEGATIVE", SentimentScore: { Negative: 0.88 } },
 *   results: [{ source: "sentiment_analyzer", result: "Sentimento=NEGATIVO | Negativo=0.88..." }],
 * });
 * // result.results[0].source === "violence_victim"
 * ```
 */
async function ViolenceVictimAssistant(state: typeof RouterState.State) {
  logger.info('[ViolenceVictimAssistant] Processando triagem de violência doméstica/gênero...');

  const summary = state.summary || String(state.query || "");
  const sentiment = state.sentiment ?? "Não disponível";
  const sentimentResult = state.results?.find((r: { source: string }) => r.source === "sentiment_analyzer");
  const userContent = sentimentResult?.result || summary;

  // RAG: recupera conhecimento especializado em violência contra a mulher e saúde mental
  let knowledgeContext = "Base de conhecimento indisponível.";
  try {
    const [serialized] = await WomansCareKnowledgeTool.invoke({ query: summary }) as [string, unknown];
    if (serialized) knowledgeContext = serialized;
  } catch (e) {
    logger.warn('Falha ao recuperar base de conhecimento:', e);
  }

  // Prompt ChatML (Qwen2.5) com seções XML estruturadas
  const response = await llm.invoke([
    {
      role: "system",
      content: `<role>
  Você é um especialista em triagem clínica de vítimas de violência doméstica e de gênero,
  treinado para identificar indicadores sutis de abuso em consultas médicas com máxima
  sensibilidade, confidencialidade e sem expor a paciente a riscos adicionais.
</role>

<knowledge_base>
${knowledgeContext}
</knowledge_base>

<consultation_summary>
${summary}
</consultation_summary>

<sentiment_analysis>
${JSON.stringify(sentiment, null, 2)}
</sentiment_analysis>

<task>
  1. Identifique padrões vocais ou textuais indicativos de trauma: hesitação, contradições,
     minimização de ferimentos, afeto achatado, medo ao mencionar parceiro/família.
  2. Aponte sinais físicos ou comportamentais relatados: hematomas sem explicação coerente,
     isolamento social forçado, controle financeiro, restrição de mobilidade.
  3. Avalie coerência entre sintomas apresentados e histórico relatado.
  4. Identifique fatores de risco para violência escalada (ciúme extremo, ameaças, armas em casa).
  5. Referencie a base de conhecimento quando relevante (protocolos de triagem, Maria da Penha, OMS).
</task>

<output_format>
  - Resumo em bullets dos indicadores e padrões identificados.
  - Nível de alerta: Atenção / Suspeita Moderada / Suspeita Alta (com fundamentação clínica).
  - Condutas recomendadas: encaminhamento para serviço social, CRAS/CREAS, Casa da Mulher,
    ou notificação compulsória se aplicável.
</output_format>

<constraints>
  - JAMAIS emita conclusões definitivas — apresente APENAS indicadores e sinais de alerta.
  - Não faça suposições além do contexto fornecido.
  - Propague incertezas: use linguagem como "pode sugerir", "é consistente com", "requer investigação".
  - Trate todas as informações com máxima confidencialidade e sigilo.
  - Priorize sempre a segurança da paciente — se houver risco imediato, sinalize como urgente.
  - Nunca revele ao suposto agressor que há suspeita de violência.
</constraints>`,
    },
    { role: "user", content: userContent },
  ]);

  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  logger.info('[ViolenceVictimAssistant] Triagem concluída.');

  return { results: [{ source: "violence_victim", result: content }] };
}

export default ViolenceVictimAssistant;
