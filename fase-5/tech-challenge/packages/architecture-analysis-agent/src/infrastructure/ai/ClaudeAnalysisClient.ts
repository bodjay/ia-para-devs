import Anthropic from '@anthropic-ai/sdk';
import { AnalysisElement, AnalysisConnection } from '../../domain/use-cases/IAnalyzeArchitectureUseCase';
import { IAnalysisClient, AnalysisResponse, AnalysisOptions } from './IAnalysisClient';

export class ClaudeAnalysisClient implements IAnalysisClient {
  private readonly client: Anthropic;
  private readonly model = 'claude-sonnet-4-6';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions
  ): Promise<AnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(elements, connections, options);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude Analysis API');
    }

    return JSON.parse(textContent.text) as AnalysisResponse;
  }

  private buildAnalysisPrompt(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions
  ): string {
    return `Analyze this software architecture with ${options.analysisDepth} depth. Language: ${options.language}.

Elements: ${JSON.stringify(elements)}
Connections: ${JSON.stringify(connections)}

Return a JSON with:
- components: [{ name, type, description, observations }]
- architecturePatterns: [{ name, confidence (0-1), description }]
${options.includeRisks ? '- risks: [{ title, description, severity (low|medium|high), affectedComponents }]' : ''}
${options.includeRecommendations ? '- recommendations: [{ title, description, priority (low|medium|high), relatedRisks }]' : ''}
- summary: string describing the overall architecture`;
  }
}
