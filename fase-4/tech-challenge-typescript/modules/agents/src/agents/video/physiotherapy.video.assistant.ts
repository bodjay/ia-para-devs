import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import VideoRouterState from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const llm = new ChatOllama({ model: "llava", temperature: 0.1 });

/**
 * @description Agente especializado em análise de vídeos de fisioterapia pós-parto
 * e reabilitação ginecológica.
 *
 * Analisa padrões de movimento e recuperação funcional:
 * - Amplitude de movimento (ADM) dos membros inferiores e superiores.
 * - Alinhamento postural: curvatura lombar, inclinação pélvica, simetria.
 * - Qualidade do movimento: fluidez, compensações, movimentos proibidos.
 * - Sinais de dor ou limitação: grimações, movimentos truncados, proteção muscular.
 * - Progressão entre frames: melhora ou deterioração na execução do exercício.
 * - Contexto do exercício: equipamentos visíveis, ambiente de reabilitação.
 *
 * @param state Estado com `frames` do vídeo de fisioterapia.
 * @returns `{ results: [{ source: "physiotherapy", result: string }] }`
 */
async function PhysiotherapyVideoAssistant(state: typeof VideoRouterState.State) {
  logger.info('[PhysiotherapyVideoAssistant] Analisando movimentos de fisioterapia pós-parto...');

  if (!state.frames || state.frames.length === 0) {
    return { results: [{ source: "physiotherapy", result: "Nenhum frame disponível para análise." }] };
  }

  const frameAnalyses: string[] = [];

  for (let i = 0; i < state.frames.length; i++) {
    try {
      const response = await llm.invoke([
        new SystemMessage(`Você é um fisioterapeuta especializado em reabilitação pós-parto,
uroginecologia e recuperação ginecológica.

Analise este frame de sessão de fisioterapia e descreva APENAS o que é VISÍVEL:
1. Postura e alinhamento: coluna vertebral, pelve, ombros (simétrico/assimétrico)
2. Amplitude de movimento: membros inferiores (abdução, flexão, extensão), membros superiores
3. Execução do exercício: técnica correta, compensações musculares visíveis
4. Sinais de desconforto ou dor: expressão facial tensa, movimento truncado, proteção da região pélvica/abdominal
5. Equipamentos e contexto: bola suíça, faixa elástica, colchonete, ambiente
6. Progressão temporal (se comparável com frames anteriores): melhora, estagnação, regressão

Classifique cada observação como:
- Adequado / Requer atenção / Comprometido

Se o frame não mostrar contexto de fisioterapia, indique claramente.
NÃO emita diagnósticos — apresente observações clínicas visuais.`),
        new HumanMessage({
          content: [
            { type: "text", text: `Análise de fisioterapia — frame ${i + 1}/${state.frames.length}:` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${state.frames[i]}` } },
          ],
        }),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
      frameAnalyses.push(`**Frame ${i + 1}:** ${content}`);
    } catch (error) {
      logger.warn(`[PhysiotherapyVideoAssistant] Erro ao analisar frame ${i + 1}:`, error);
      frameAnalyses.push(`**Frame ${i + 1}:** Não foi possível analisar este frame.`);
    }
  }

  const aggregated = frameAnalyses.join("\n\n");
  logger.info('[PhysiotherapyVideoAssistant] Análise de fisioterapia concluída.');

  return { results: [{ source: "physiotherapy", result: aggregated }] };
}

export default PhysiotherapyVideoAssistant;
