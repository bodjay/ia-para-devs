import { IAnalysisClient, AnalysisResponse, AnalysisOptions } from './IAnalysisClient';
import { AnalysisElement, AnalysisConnection } from '../../domain/use-cases/IAnalyzeArchitectureUseCase';

export class OllamaAnalysisClient implements IAnalysisClient {
  constructor(
    private readonly baseUrl: string = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    private readonly model: string = process.env.OLLAMA_MODEL ?? 'qwen3:4b',
    private readonly timeoutMs: number = 300_000
  ) {}

  async analyze(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions
  ): Promise<AnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(elements, connections, options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned status ${response.status}`);
      }

      const data = (await response.json()) as { message: { content: string } };

      // Strip markdown code fences if the model wraps the JSON
      const raw = data.message.content.trim();
      const json = raw.startsWith('```')
        ? raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim()
        : raw;

      return JSON.parse(json) as AnalysisResponse;
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
    options: AnalysisOptions
  ): string {
    return `Analyze this software architecture with ${options.analysisDepth} depth. Language: ${options.language}.

Elements: ${JSON.stringify(elements)}
Connections: ${JSON.stringify(connections)}

Return a JSON object with:
- components: [{ name, type, description, observations }]
- architecturePatterns: [{ name, confidence (0-1), description }]
${options.includeRisks ? '- risks: [{ title, description, severity (low|medium|high), affectedComponents }]' : ''}
${options.includeRecommendations ? '- recommendations: [{ title, description, priority (low|medium|high), relatedRisks }]' : ''}
- summary: string describing the overall architecture

Respond with valid JSON only, no markdown.`;
  }
}
