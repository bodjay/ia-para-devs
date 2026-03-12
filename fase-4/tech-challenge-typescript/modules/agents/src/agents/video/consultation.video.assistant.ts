import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import VideoRouterState from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const llm = new ChatOllama({ model: "llava", temperature: 0.1 });

/**
 * @description Agente especializado em análise de vídeos de consultas médicas.
 *
 * Identifica sinais não-verbais de desconforto, medo ou sofrimento psicológico
 * visíveis nos frames da consulta:
 * - Expressões faciais: tensão, choro contido, afeto achatado, evitação de contato visual.
 * - Postura corporal: encolhimento, postura defensiva, rigidez, tremores.
 * - Linguagem gestual: auto-toque excessivo, cobrir a boca, mãos entreladas.
 * - Interação com profissional: resistência ao exame, hesitação, silêncios prolongados.
 * - Indicadores ambientais: presença de acompanhante controlador.
 *
 * @param state Estado com `frames` do vídeo de consulta.
 * @returns `{ results: [{ source: "consultation_video", result: string }] }`
 */
async function ConsultationVideoAssistant(state: typeof VideoRouterState.State) {
  logger.info('[ConsultationVideoAssistant] Analisando sinais não-verbais em consulta médica...');

  if (!state.frames || state.frames.length === 0) {
    return { results: [{ source: "consultation_video", result: "Nenhum frame disponível para análise." }] };
  }

  const frameAnalyses: string[] = [];

  for (let i = 0; i < state.frames.length; i++) {
    try {
      const response = await llm.invoke([
        new SystemMessage(`Você é um especialista em comunicação não-verbal e psicologia clínica,
treinado para identificar sinais de desconforto, medo e sofrimento emocional em consultas médicas
voltadas à saúde da mulher.

Analise este frame de consulta médica e descreva APENAS o que é VISÍVEL:
1. Expressão facial da paciente: tensão muscular, choro, afeto achatado, evitação de olhar
2. Postura corporal: encolhimento, cruzamento excessivo de membros, rigidez, tremor
3. Gestos e autotoque: cobertura da boca, mãos entreladas, toques repetitivos no corpo
4. Interação com o profissional: abertura, resistência, distância física, postura de evitação
5. Dinâmica do ambiente: presença de terceiros, expressões de controle ou vigilância

Escala de atenção por indicador:
- Neutro / Observação / Atenção / Alerta

Se o frame não mostrar contexto de consulta, indique claramente.
Use linguagem como "aparenta", "pode sugerir", "é consistente com". NÃO emita diagnósticos.`),
        new HumanMessage({
          content: [
            { type: "text", text: `Análise de sinais não-verbais — frame ${i + 1}/${state.frames.length}:` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${state.frames[i]}` } },
          ],
        }),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
      frameAnalyses.push(`**Frame ${i + 1}:** ${content}`);
    } catch (error) {
      logger.warn(`[ConsultationVideoAssistant] Erro ao analisar frame ${i + 1}:`, error);
      frameAnalyses.push(`**Frame ${i + 1}:** Não foi possível analisar este frame.`);
    }
  }

  const aggregated = frameAnalyses.join("\n\n");
  logger.info('[ConsultationVideoAssistant] Análise de consulta concluída.');

  return { results: [{ source: "consultation_video", result: aggregated }] };
}

export default ConsultationVideoAssistant;
