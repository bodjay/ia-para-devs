import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import VideoRouterState from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const llm = new ChatOllama({ model: "llava", temperature: 0.1 });

/**
 * @description Agente especializado em análise de vídeos cirúrgicos ginecológicos.
 *
 * Detecta em cada frame:
 * - Presença e identificação de instrumentos cirúrgicos ginecológicos.
 * - Sinais de sangramento anômalo ou excessivo no campo operatório.
 * - Áreas anatômicas críticas: útero, ovários, mamas, trompas.
 * - Complicações visíveis: perfuração, hemorragia, contaminação.
 * - Indicadores de objetos suspeitos que possam indicar automutilação.
 *
 * Processa todos os frames disponíveis e consolida a análise por frame
 * antes de emitir o resultado agregado para o nó de relatório.
 *
 * @param state Estado com `frames` extraídos do vídeo cirúrgico.
 * @returns `{ results: [{ source: "surgery", result: string }] }`
 */
async function SurgeryVideoAssistant(state: typeof VideoRouterState.State) {
  logger.info('[SurgeryVideoAssistant] Analisando vídeo cirúrgico ginecológico...');

  if (!state.frames || state.frames.length === 0) {
    return { results: [{ source: "surgery", result: "Nenhum frame disponível para análise cirúrgica." }] };
  }

  const frameAnalyses: string[] = [];

  for (let i = 0; i < state.frames.length; i++) {
    try {
      const response = await llm.invoke([
        new SystemMessage(`Você é um especialista em cirurgia ginecológica e laparoscopia.
Analise este frame de vídeo cirúrgico com foco em segurança e detecção de complicações.

Avalie e descreva APENAS o que é VISÍVEL no frame:
1. Instrumentos cirúrgicos ginecológicos presentes (especifique tipo se identificável)
2. Campo operatório: presença e característica de sangramentos (cor, volume estimado, origem)
3. Estruturas anatômicas visíveis (útero, ovários, mamas, trompas — mencione apenas as identificáveis)
4. Sinais de complicação: hemorragia ativa, perfuração, tecido comprometido, contaminação
5. Objetos suspeitos fora do contexto cirúrgico padrão
6. Qualidade do campo visual (clareza, iluminação, campo limpo vs. comprometido)

Se o frame não mostrar contexto cirúrgico, indique claramente.
Seja objetivo e clínico. NÃO emita diagnósticos — apresente observações visuais.`),
        new HumanMessage({
          content: [
            { type: "text", text: `Análise do frame ${i + 1}/${state.frames.length}:` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${state.frames[i]}` } },
          ],
        }),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
      frameAnalyses.push(`**Frame ${i + 1}:** ${content}`);
    } catch (error) {
      logger.warn(`[SurgeryVideoAssistant] Erro ao analisar frame ${i + 1}:`, error);
      frameAnalyses.push(`**Frame ${i + 1}:** Não foi possível analisar este frame.`);
    }
  }

  const aggregated = frameAnalyses.join("\n\n");
  logger.info('[SurgeryVideoAssistant] Análise cirúrgica concluída.');

  return { results: [{ source: "surgery", result: aggregated }] };
}

export default SurgeryVideoAssistant;
