import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import SentimentAnalyzerService from "../services/sentment.analyzer.js";

const CHUNK_SIZE = 4000;

/**
 * @description Agente de análise de sentimento especializado em saúde feminina.
 *
 * Analisa o texto da consulta (resumo ou query original) usando AWS Comprehend
 * para detectar sentimentos associados a: ansiedade gestacional, depressão pós-parto,
 * estresse relacionado a violência doméstica e estados emocionais em geral.
 *
 * Os resultados são armazenados em `state.results` (acumulador) e em `state.sentiment`
 * para uso pelos agentes especializados downstream.
 *
 * @param state Estado atual do workflow com `summary` e/ou `query`.
 * @returns `{ results: [...], sentiment: {...} }` com os dados de sentimento.
 *
 * @example
 * ```ts
 * const result = await SentimentAssistant({
 *   summary: "Paciente demonstra ansiedade intensa sobre sua gravidez e dificuldade para dormir.",
 * });
 * // result.results[0].source === "sentiment_analyzer"
 * // result.sentiment.Sentiment === "NEGATIVE"
 * ```
 */
async function SentimentAssistant(state: typeof RouterState.State) {
  logger.info('[SentimentAssistant] Iniciando análise de sentimento...');

  const text = state.summary || String(state.query || "");

  if (!text.trim()) {
    logger.warn('[SentimentAssistant] Texto vazio — pulando análise de sentimento.');
    return {
      sentiment: null,
      results: [{ source: "sentiment_analyzer", result: "Texto vazio — análise de sentimento indisponível." }],
    };
  }

  try {
    const sentimentResults = await SentimentAnalyzerService(text);

    logger.info(`[SentimentAssistant] Análise concluída: ${sentimentResults.length} chunk(s) processado(s).`);

    // Agrega os resultados de todos os chunks em um sumário legível
    const summaryLines = sentimentResults.map((r, i) => {
      const s = r.sentiment;
      const scores = s.SentimentScore;
      return (
        `Chunk ${i + 1}: Sentimento=${s.Sentiment}` +
        (scores
          ? ` | Positivo=${scores.Positive?.toFixed(2)}, Negativo=${scores.Negative?.toFixed(2)}, Neutro=${scores.Neutral?.toFixed(2)}, Misto=${scores.Mixed?.toFixed(2)}`
          : "")
      );
    });

    // Sentimento dominante (do primeiro chunk — mais relevante para a query comprimida)
    const dominant = sentimentResults[0]?.sentiment;

    const resultSummary = summaryLines.join("\n");

    return {
      sentiment: dominant,
      results: [{ source: "sentiment_analyzer", result: resultSummary }],
    };

  } catch (error) {
    logger.error('[error: SentimentAssistant] Falha na análise de sentimento:', error);
    return {
      sentiment: null,
      results: [{ source: "sentiment_analyzer", result: `Análise de sentimento indisponível: ${String(error)}` }],
    };
  }
}

export default SentimentAssistant;
