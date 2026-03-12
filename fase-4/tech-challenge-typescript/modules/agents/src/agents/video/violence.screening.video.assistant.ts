import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import VideoRouterState from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const llm = new ChatOllama({ model: "llava", temperature: 0.1 });

/**
 * @description Agente especializado em triagem de violência doméstica e de gênero
 * por análise de linguagem corporal e sinais físicos em vídeo.
 *
 * Detecta indicadores visuais com máxima sensibilidade e confidencialidade:
 * - Marcas físicas visíveis: hematomas, cortes, queimaduras em regiões expostas.
 * - Linguagem corporal de medo: postura encolhida, tremor, hipervigilância.
 * - Sinais de dissociação: olhar fixo, afeto embotado, movimentos automáticos.
 * - Dinâmica com acompanhante: controle de espaço, respostas monitoradas.
 * - Indicadores de objetos suspeitos que possam indicar automutilação (YOLOv8-like).
 * - Vestuário: roupas que cubram lesões em clima quente, uso de maquiagem intensa.
 *
 * Opera com o princípio de NÃO exposição: não revela suspeitas ao possível agressor.
 *
 * @param state Estado com `frames` do vídeo de triagem.
 * @returns `{ results: [{ source: "violence_screening", result: string }] }`
 */
async function ViolenceScreeningVideoAssistant(state: typeof VideoRouterState.State) {
  logger.info('[ViolenceScreeningVideoAssistant] Iniciando triagem de violência por análise visual...');

  if (!state.frames || state.frames.length === 0) {
    return { results: [{ source: "violence_screening", result: "Nenhum frame disponível para análise." }] };
  }

  // ── Contexto adicional do YOLOv8 ──────────────────────────────────────
  let yoloContext = "";
  if (state.yoloAnalysis) {
    const { clinical_analysis, frames_processed } = state.yoloAnalysis as any;
    const indicators = (clinical_analysis?.indicators ?? [])
      .filter((i: any) => i.detected)
      .map((i: any) => `- ${i.description} (confiança: ${(i.confidence * 100).toFixed(0)}%)`)
      .join("\n");

    yoloContext = `
=== ANÁLISE YOLOv8 (${frames_processed} frames) ===
Tipo detectado: ${clinical_analysis?.video_type ?? "desconhecido"}
Nível de risco: ${clinical_analysis?.risk_level ?? "desconhecido"}
Sumário: ${clinical_analysis?.summary ?? ""}
${indicators ? `Indicadores detectados:\n${indicators}` : ""}
========================================
Use essas informações como contexto objetivo adicional para sua análise visual.
`;
    logger.info('[ViolenceScreeningVideoAssistant] Contexto YOLO integrado.', {
      riskLevel: clinical_analysis?.risk_level,
    });
  }

  const frameAnalyses: string[] = [];

  for (let i = 0; i < state.frames.length; i++) {
    try {
      const response = await llm.invoke([
        new SystemMessage(`Você é um especialista em triagem clínica de vítimas de violência doméstica e de gênero,
treinado para identificar indicadores sutis de abuso em contextos médicos.
Opera com máxima confidencialidade e sem expor a paciente a riscos adicionais.
${yoloContext}

Analise este frame e descreva APENAS o que é VISÍVEL:
1. Sinais físicos: hematomas (cor, formato, localização), cortes, queimaduras, marcas em pele exposta
2. Linguagem corporal: postura de encolhimento, cruzamento excessivo de membros, tremor, rigidez
3. Expressão facial: hipervigilância, olhar de verificação constante, afeto embotado, medo latente
4. Vestuário: cobertura excessiva para o clima, uso de acessórios que possam esconder marcas
5. Objetos no ambiente: itens que possam indicar automutilação ou autoagressão (lâminas, objetos cortantes)
6. Dinâmica interpessoal: presença de acompanhante vigilante, posicionamento de controle de espaço

Nível de alerta por indicador:
- Observação / Atenção / Suspeita moderada / Suspeita alta

JAMAIS emita conclusões definitivas. Use linguagem como "pode sugerir", "é consistente com",
"requer investigação clínica adicional".
Trate todas as observações com máxima confidencialidade.`),
        new HumanMessage({
          content: [
            { type: "text", text: `Triagem visual de indicadores de violência — frame ${i + 1}/${state.frames.length}:` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${state.frames[i]}` } },
          ],
        }),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
      frameAnalyses.push(`**Frame ${i + 1}:** ${content}`);
    } catch (error) {
      logger.warn(`[ViolenceScreeningVideoAssistant] Erro ao analisar frame ${i + 1}:`, error);
      frameAnalyses.push(`**Frame ${i + 1}:** Não foi possível analisar este frame.`);
    }
  }

  const aggregated = frameAnalyses.join("\n\n");
  logger.info('[ViolenceScreeningVideoAssistant] Triagem visual concluída.');

  return { results: [{ source: "violence_screening", result: aggregated }] };
}

export default ViolenceScreeningVideoAssistant;
