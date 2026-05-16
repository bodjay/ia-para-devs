import Anthropic from '@anthropic-ai/sdk';
import { AnalysisElement, AnalysisConnection } from '../../domain/use-cases/IAnalyzeArchitectureUseCase';
import { IAnalysisClient, AnalysisResponse, AnalysisOptions } from './IAnalysisClient';
import { AnalysisResponseSchema } from './responseSchema';

export class ClaudeAnalysisClient implements IAnalysisClient {
  private readonly client: Anthropic;
  private readonly model = 'claude-sonnet-4-6';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions,
    extractedText?: string
  ): Promise<AnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(elements, connections, options, extractedText);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude Analysis API');
    }

    const parsed = AnalysisResponseSchema.parse(JSON.parse(textContent.text));
    return parsed as AnalysisResponse;
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

Respond with valid JSON only. No markdown, no code fences.`;
  }
}
