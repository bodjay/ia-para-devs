import { IAnalysisClient, AnalysisResponse, AnalysisOptions } from './IAnalysisClient';
import { AnalysisElement, AnalysisConnection } from '../../domain/use-cases/IAnalyzeArchitectureUseCase';
import { AnalysisResponseSchema } from './responseSchema';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_RETRIES = 2;

function stripFences(raw: string): string {
  return raw.startsWith('```')
    ? raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim()
    : raw.trim();
}

export class OllamaAnalysisClient implements IAnalysisClient {
  constructor(
    private readonly baseUrl: string = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    private readonly model: string = process.env.OLLAMA_MODEL ?? 'qwen3:2b',
    private readonly timeoutMs: number = 300_000
  ) {}

  async analyze(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions,
    extractedText?: string
  ): Promise<AnalysisResponse> {
    const systemPrompt = this.buildAnalysisPrompt(elements, connections, options, extractedText);
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
    return this.callWithRetry(messages);
  }

  private async callWithRetry(messages: ChatMessage[]): Promise<AnalysisResponse> {
    let lastError: Error | null = null;
    let currentMessages = [...messages];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const raw = await this.callOllama(currentMessages);

      try {
        const parsed = AnalysisResponseSchema.parse(JSON.parse(stripFences(raw)));
        return parsed as AnalysisResponse;
      } catch (err) {
        lastError = err as Error;
        console.warn(
          `[OllamaAnalysisClient] Validation failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`
        );

        if (attempt < MAX_RETRIES) {
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: raw },
            {
              role: 'user',
              content: `Your response failed validation. Error: ${lastError.message}. Return corrected valid JSON only, no markdown.`,
            },
          ];
        }
      }
    }

    throw lastError!;
  }

  private async callOllama(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned status ${response.status}`);
      }

      const data = (await response.json()) as { message: { content: string } };
      return data.message.content;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`timeout: Ollama request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildAnalysisPrompt(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions,
    extractedText?: string
  ): string {
    const ocrSection = extractedText
      ? `OCR text extracted from the diagram:\n${extractedText}\n\n`
      : '';

    return `Analyze this software architecture with ${options.analysisDepth} depth.
IMPORTANT: ALL text content in the JSON response (every string field: name, type, description, observations, title, summary, etc.) MUST be written in ${options.language} (Brazilian Portuguese). Do not use English or any other language for any text field.

${ocrSection}Elements: ${JSON.stringify(elements)}
Connections: ${JSON.stringify(connections)}

Return a JSON object with this exact structure. All string fields marked as required MUST be non-empty:
{
  "components": [{ "name": "<required, non-empty>", "type": "<string>", "description": "<string>", "observations": "<string>" }],
  "architecturePatterns": [{ "name": "<required, non-empty>", "confidence": <0.0-1.0>, "description": "<string>" }],
${options.includeRisks ? `  "risks": [{ "title": "<required, non-empty>", "description": "<required, non-empty>", "severity": "low"|"medium"|"high", "affectedComponents": ["<string>"] }],` : '  "risks": [],'}
${options.includeRecommendations ? `  "recommendations": [{ "title": "<required, non-empty>", "description": "<required, non-empty>", "priority": "low"|"medium"|"high", "relatedRisks": ["<string>"] }],` : '  "recommendations": [],'}
  "summary": "<required, non-empty string describing the overall architecture>"
}

Respond with valid JSON only. No markdown, no code fences, no extra text.`;
  }
}
