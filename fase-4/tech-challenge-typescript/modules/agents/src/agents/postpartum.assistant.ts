import { ChatOllama } from "@langchain/ollama";
import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import WomansCareKnowledgeTool from "../tools/womans.care.knowledge.tool.js";

const llm = new ChatOllama({ model: "qwen2.5:0.5b", temperature: 0.3 });

/**
 * @description Agente especializado em cuidados pós-parto e detecção de depressão pós-parto (DPP).
 *
 * Identifica sinais precoces de depressão pós-parto, dificuldades na recuperação física,
 * distúrbios de humor e necessidades de suporte psicossocial no período puerperal.
 * Enriquece a análise via RAG (WomansCareKnowledgeTool) com conhecimento especializado
 * em saúde mental perinatal.
 *
 * Prompt template: ChatML (Qwen2.5) com seções XML estruturadas.
 *
 * @param state Estado atual com `summary`, `sentiment` e `results` acumulados.
 * @returns `{ results: [{ source: "postpartum", result: string }] }`
 *
 * @example
 * ```ts
 * const result = await PostpartumAssistant({
 *   summary: "Puérpera de 3 semanas relata choro frequente, falta de vínculo com o bebê e insônia severa.",
 *   sentiment: { Sentiment: "NEGATIVE", SentimentScore: { Negative: 0.91 } },
 *   results: [{ source: "sentiment_analyzer", result: "Sentimento=NEGATIVO | Negativo=0.91..." }],
 * });
 * // result.results[0].source === "postpartum"
 * ```
 */
async function PostpartumAssistant(state: typeof RouterState.State) {
  logger.info('[PostpartumAssistant] Processando consulta pós-parto...');

  const summary = state.summary || String(state.query || "");
  const sentiment = state.sentiment ?? "Não disponível";
  const sentimentResult = state.results?.find((r) => r.source === "sentiment_analyzer");
  const userContent = sentimentResult?.result || summary;

  // RAG: recupera conhecimento especializado em saúde mental perinatal
  let knowledgeContext = "Base de conhecimento indisponível.";
  try {
    const [serialized] = await WomansCareKnowledgeTool.invoke({ query: summary }) as [string, unknown];
    if (serialized) knowledgeContext = serialized;
  } catch (e) {
    logger.warn('[warn: PostpartumAssistant] Falha ao recuperar base de conhecimento:', e);
  }

  // Prompt ChatML (Qwen2.5) com seções XML estruturadas
  const response = await llm.invoke([
    {
      role: "system",
      content: `<role>
  Você é um especialista em saúde mental perinatal e cuidados pós-parto.
  Analisa transcrições e resumos de consultas para detectar precocemente sinais de depressão pós-parto (DPP)
  e outras dificuldades do período puerperal, com foco na segurança da mãe e do bebê.
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
  1. Identifique sinais de depressão pós-parto: choro frequente, falta de vínculo com o bebê,
     sentimentos de inadequação, pensamentos intrusivos, insônia, irritabilidade extrema.
  2. Avalie indicadores de psicose puerperal (sintomas graves que requerem atenção imediata).
  3. Liste dificuldades na recuperação física e emocional mencionadas na consulta.
  4. Identifique fatores de risco presentes (isolamento social, falta de suporte, histórico de depressão).
  5. Referencie a base de conhecimento quando relevante.
</task>

<output_format>
  - Resumo em bullets dos sinais e indicadores identificados.
  - Nível de urgência: Rotina / Prioritário / Urgente (com justificativa baseada nos critérios Edinburgh ou DSM-5).
  - Recomendações de encaminhamento ou suporte (ex.: psiquiatria, grupos de apoio, CAPS).
</output_format>

<constraints>
  - Não emita diagnósticos definitivos — apresente indicadores e sinais de alerta.
  - Não faça suposições além do contexto fornecido.
  - Propague incertezas: use linguagem como "pode sugerir", "é consistente com", "requer avaliação adicional".
  - Priorize a segurança: se houver qualquer indicação de risco para a mãe ou bebê, sinalize como urgente.
  - Mantenha linguagem clínica, empática e livre de julgamentos.
</constraints>`,
    },
    { role: "user", content: userContent },
  ]);

  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  logger.info('[PostpartumAssistant] Análise concluída.');

  return { results: [{ source: "postpartum", result: content }] };
}

export default PostpartumAssistant;
