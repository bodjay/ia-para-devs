import { ChatOllama } from "@langchain/ollama";
import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import WomansCareKnowledgeTool from "../tools/womans.care.knowledge.tool.js";

const llm = new ChatOllama({ model: "qwen2.5:0.5b", temperature: 0.3 });

/**
 * @description Agente especializado em cuidados pré-natais.
 *
 * Identifica sinais de ansiedade gestacional, preocupações com a gravidez e
 * necessidades de acompanhamento pré-natal. Enriquece a análise via RAG
 * (WomansCareKnowledgeTool) consultando a base de conhecimento de saúde materna.
 *
 * Prompt template: ChatML (Qwen2.5) com seções XML estruturadas.
 *
 * @param state Estado atual com `summary`, `sentiment` e `results` acumulados.
 * @returns `{ results: [{ source: "prenatal_care", result: string }] }`
 *
 * @example
 * ```ts
 * const result = await PrenatalCareAssistant({
 *   summary: "Paciente de 22 semanas relata insônia intensa e medo do parto.",
 *   sentiment: { Sentiment: "NEGATIVE" },
 *   results: [{ source: "sentiment_analyzer", result: "Sentimento=NEGATIVO | Negativo=0.82..." }],
 * });
 * // result.results[0].source === "prenatal_care"
 * ```
 */
async function PrenatalCareAssistant(state: typeof RouterState.State) {
  logger.info('[PrenatalCareAssistant] Processando consulta pré-natal...');

  const summary = state.summary || String(state.query || "");
  const sentiment = state.sentiment ?? "Não disponível";
  const sentimentResult = state.results?.find((r) => r.source === "sentiment_analyzer");
  const userContent = sentimentResult?.result || summary;

  // RAG: recupera conhecimento especializado da base de saúde materna
  let knowledgeContext = "Base de conhecimento indisponível.";
  try {
    const [serialized] = await WomansCareKnowledgeTool.invoke({ query: summary }) as [string, unknown];
    if (serialized) knowledgeContext = serialized;
  } catch (e) {
    logger.warn('[warn: PrenatalCareAssistant] Falha ao recuperar base de conhecimento:', e);
  }

  // Prompt ChatML (Qwen2.5) com seções XML estruturadas
  const response = await llm.invoke([
    {
      role: "system",
      content: `<role>
  Você é um especialista em cuidados pré-natais e saúde mental gestacional.
  Analisa transcrições e resumos de consultas médicas para identificar sinais precoces de risco.
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
  1. Identifique sinais de ansiedade gestacional (insônia, medo do parto, preocupação excessiva).
  2. Liste as principais preocupações relacionadas à gravidez expressas na consulta.
  3. Aponte indicadores emocionais que possam requerer suporte psicológico adicional.
  4. Referencie a base de conhecimento quando relevante para embasar suas observações.
</task>

<output_format>
  - Resumo em bullets das observações clínicas relevantes.
  - Nível de risco aparente: Baixo / Moderado / Elevado (com justificativa breve).
  - Recomendações de acompanhamento (se aplicável).
</output_format>

<constraints>
  - Não emita diagnósticos definitivos — apresente observações e indicadores.
  - Não faça suposições além do contexto fornecido.
  - Propague incertezas: use linguagem como "pode indicar", "sugere", "aparenta".
  - Mantenha linguagem clínica e empática.
</constraints>`,
    },
    { role: "user", content: userContent },
  ]);

  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  logger.info('[PrenatalCareAssistant] Análise concluída.');

  return { results: [{ source: "prenatal_care", result: content }] };
}

export default PrenatalCareAssistant;
