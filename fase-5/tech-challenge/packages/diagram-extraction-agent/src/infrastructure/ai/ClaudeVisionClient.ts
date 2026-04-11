import Anthropic from '@anthropic-ai/sdk';
import { ElementType } from '../../domain/entities/DiagramElement';
import { ConnectionType } from '../../domain/entities/ExtractionResult';

export interface ClaudeExtractionResponse {
  extractedText: string;
  elements: Array<{
    id: string;
    label: string;
    type: ElementType;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  connections: Array<{
    fromElementId: string;
    toElementId: string;
    type: ConnectionType;
    label?: string;
  }>;
}

export class ClaudeVisionClient {
  private readonly client: Anthropic;
  private readonly model = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async extractFromUrl(storageUrl: string, fileType: string, extractedText?: string): Promise<ClaudeExtractionResponse> {
    const prompt = this.buildExtractionPrompt(fileType, extractedText);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: storageUrl,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude Vision API');
    }

    return JSON.parse(textContent.text) as ClaudeExtractionResponse;
  }

  private buildExtractionPrompt(fileType: string, extractedText?: string): string {
    const preExtracted = extractedText
      ? `\nPre-extracted text from the document (use this to improve accuracy):\n${extractedText}\n`
      : '';

    return `Analyze this architecture diagram (${fileType}) and extract all elements and connections.${preExtracted}
Return a JSON object with:
- extractedText: all visible text in the diagram
- elements: array of { id, label, type (microservice|database|broker|client|unknown), confidence (0-1), boundingBox { x, y, width, height } }
- connections: array of { fromElementId, toElementId, type (sync|async|unknown), label }

Focus on identifying microservices, databases, message brokers, and client applications.
Classify connections as sync (direct HTTP/REST) or async (Kafka/queue-based).`;
  }
}
