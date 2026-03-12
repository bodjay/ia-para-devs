import { ChatOllama } from "@langchain/ollama";
import VideoRouterState from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const llm = new ChatOllama({ model: "llama3.2:1b", temperature: 0.2 });

const reportTitles: Record<string, string> = {
  surgery: "Relatório de Análise Cirúrgica Ginecológica",
  consultation_video: "Relatório de Sinais Não-Verbais em Consulta Médica",
  physiotherapy: "Relatório de Análise de Fisioterapia Pós-Parto",
  violence_screening: "Relatório de Triagem de Indicadores de Violência",
  unknown: "Relatório de Análise de Vídeo Clínico",
};

/**
 * @description Agente responsável por sintetizar todos os resultados frame-a-frame
 * em um relatório clínico estruturado e acionável.
 *
 * O relatório inclui:
 * - Contexto clínico identificado.
 * - Principais achados por categoria.
 * - Nível de alerta geral (Rotina / Atenção / Suspeita / Urgente).
 * - Condutas recomendadas específicas ao tipo de vídeo.
 * - Limitações da análise automatizada.
 *
 * @param state Estado com `results` acumulados e `videoClassification`.
 * @returns `{ finalReport: string }`
 */
async function VideoReportAssistant(state: typeof VideoRouterState.State) {
  logger.info('[VideoReportAssistant] Gerando relatório clínico final...');

  const classification = state.videoClassification || "unknown";
  const title = reportTitles[classification] ?? reportTitles["unknown"];

  if (!state.results || state.results.length === 0) {
    return {
      finalReport: `# ${title}\n\n**Nenhum dado de análise disponível.**\n\nVerifique se o arquivo de vídeo foi processado corretamente.`,
    };
  }

  const analysisContext = state.results
    .map((r) => `### Análise [${r.source}]\n${r.result}`)
    .join("\n\n---\n\n");

  const conductaMap: Record<string, string> = {
    surgery: `- Acionar equipe cirúrgica de plantão se houver sangramento ativo identificado.
- Revisar instrumentação com scrub nurse.
- Registrar achados no prontuário cirúrgico.
- Escalar ao chefe de equipe em caso de complicação grave.`,
    consultation_video: `- Garantir atendimento privativo sem presença de acompanhante suspeito.
- Aplicar protocolo de escuta ativa e acolhimento.
- Encaminhar para assistente social se indicadores de violência forem confirmados.
- Registrar observações no prontuário com linguagem neutra.`,
    physiotherapy: `- Revisar plano terapêutico com fisioterapeuta responsável.
- Ajustar carga ou amplitude de movimento se compensações identificadas.
- Avaliar necessidade de nova avaliação funcional do assoalho pélvico.
- Registrar evolução no prontuário fisioterápico.`,
    violence_screening: `- Acionar serviço social e equipe de proteção à mulher.
- Aplicar protocolo de triagem de violência doméstica (OMS / Maria da Penha).
- Encaminhar para CRAS, CREAS ou Casa da Mulher Brasileira se indicado.
- Notificação compulsória se houver suspeita confirmada de violência.
- NUNCA revelar suspeita ao possível agressor.`,
    unknown: `- Revisar manualmente o conteúdo do vídeo com profissional especializado.
- Consultar equipe multidisciplinar para avaliação complementar.`,
  };

  const condutas = conductaMap[classification] ?? conductaMap["unknown"];

  const response = await llm.invoke([
    {
      role: "system",
      content: `Você é um especialista em saúde da mulher responsável por sintetizar análises
clínicas de vídeo em relatórios estruturados, acionáveis e eticamente responsáveis.

Tipo de análise: ${title}

Análises frame-a-frame disponíveis:
${analysisContext}

Gere um relatório clínico estruturado com as seções:
1. RESUMO EXECUTIVO (2-3 frases com os achados mais relevantes)
2. ACHADOS PRINCIPAIS (bullets com os padrões mais frequentes ou significativos entre os frames)
3. NÍVEL DE ALERTA GERAL (Rotina / Atenção / Suspeita / Urgente — com justificativa)
4. LIMITAÇÕES (limitações desta análise automatizada)

Use linguagem clínica, objetiva e empática. NÃO emita diagnósticos definitivos.
Use sempre linguagem condicional: "pode sugerir", "é consistente com", "requer avaliação".`,
    },
    {
      role: "user",
      content: "Sintetize os achados em um relatório clínico estruturado.",
    },
  ]);

  const synthesis = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  const finalReport = `# ${title}

${synthesis}

---

## CONDUTAS RECOMENDADAS

${condutas}

---

*Relatório gerado automaticamente por análise de IA. Deve ser revisado por profissional de saúde habilitado antes de qualquer intervenção clínica.*`;

  logger.info('[VideoReportAssistant] Relatório clínico gerado com sucesso.');
  return { finalReport };
}

export default VideoReportAssistant;
