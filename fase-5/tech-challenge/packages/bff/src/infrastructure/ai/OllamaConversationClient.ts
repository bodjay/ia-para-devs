import { AnalysisResult } from '../../domain/entities/AnalysisResult';
import { ConversationMessage, IConversationClient } from '../../domain/services/IConversationClient';

export class OllamaConversationClient implements IConversationClient {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
  }

  async chat(
    analysisContext: AnalysisResult,
    question: string,
    history: ConversationMessage[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(analysisContext);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: question },
    ];

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content ?? 'Sem resposta do modelo.';
  }

  private buildSystemPrompt(ctx: AnalysisResult): string {
    const components = ctx.components
      .map((c) => `- ${c.name} (${c.type}): ${c.description}`)
      .join('\n');
    const risks = ctx.risks
      .map((r) => `- [${r.severity}] ${r.title}: ${r.description}`)
      .join('\n');
    const recommendations = ctx.recommendations
      .map((r) => `- [${r.priority}] ${r.title}: ${r.description}`)
      .join('\n');

    return `Você é um assistente especialista em arquitetura de software. Responda perguntas sobre o diagrama analisado abaixo.

## Resumo
${ctx.summary}

## Componentes
${components}

## Riscos
${risks}

## Recomendações
${recommendations}

Responda de forma objetiva e técnica em pt-BR.`;
  }
}
