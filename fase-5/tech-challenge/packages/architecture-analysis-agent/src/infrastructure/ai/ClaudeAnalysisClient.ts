import Anthropic from '@anthropic-ai/sdk';
import { AnalysisComponent, ArchitecturePattern, AnalysisError } from '../../domain/entities/ArchitectureAnalysis';
import { SeverityLevel } from '../../domain/entities/ArchitectureRisk';
import { PriorityLevel } from '../../domain/entities/ArchitectureRecommendation';
import { AnalysisElement, AnalysisConnection, AnalysisDepth } from '../../domain/use-cases/IAnalyzeArchitectureUseCase';

export interface ClaudeRisk {
  title: string;
  description: string;
  severity: SeverityLevel;
  affectedComponents: string[];
}

export interface ClaudeRecommendation {
  title: string;
  description: string;
  priority: PriorityLevel;
  relatedRisks: string[];
}

export interface ClaudeAnalysisResponse {
  components: AnalysisComponent[];
  architecturePatterns: ArchitecturePattern[];
  risks: ClaudeRisk[];
  recommendations: ClaudeRecommendation[];
  summary: string;
}

export class ClaudeAnalysisClient {
  private readonly client: Anthropic;
  private readonly model = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: {
      analysisDepth: AnalysisDepth;
      includeRisks: boolean;
      includeRecommendations: boolean;
      language: string;
    }
  ): Promise<ClaudeAnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(elements, connections, options);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude Analysis API');
    }

    return JSON.parse(textContent.text) as ClaudeAnalysisResponse;
  }

  private buildAnalysisPrompt(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: {
      analysisDepth: AnalysisDepth;
      includeRisks: boolean;
      includeRecommendations: boolean;
      language: string;
    }
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
