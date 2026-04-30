import { IVisionClient, VisionExtractionResponse } from './IVisionClient';
import { ProcessingServiceClient } from '../tools/ProcessingServiceClient';

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface OllamaMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
}

interface OllamaResponse {
  message: OllamaMessage;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'ocr_extract',
      description:
        'Extract all text from an architecture diagram stored in S3 using AWS Textract OCR. Call this to read the diagram content before analyzing it.',
      parameters: {
        type: 'object',
        properties: {
          s3_url: { type: 'string', description: 'The S3 URL of the diagram image' },
        },
        required: ['s3_url'],
      },
    },
  },
];

export class OllamaVisionClient implements IVisionClient {
  constructor(
    private readonly processingClient: ProcessingServiceClient,
    private readonly baseUrl: string = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    private readonly model: string = process.env.OLLAMA_MODEL ?? 'qwen3:2b',
    private readonly timeoutMs: number = 300_000
  ) {}

  async extractFromUrl(
    storageUrl: string,
    fileType: string,
    extractedText?: string
  ): Promise<VisionExtractionResponse> {
    const messages: OllamaMessage[] = [
      { role: 'user', content: this.buildPrompt(storageUrl, fileType, extractedText) },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.model, messages, tools: TOOLS, stream: false }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Ollama API returned status ${response.status}`);
        }

        const data = (await response.json()) as OllamaResponse;
        const assistantMessage = data.message;
        messages.push(assistantMessage);

        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          return this.parseResult(assistantMessage.content);
        }

        for (const toolCall of assistantMessage.tool_calls) {
          const result = await this.executeTool(toolCall);
          messages.push({ role: 'tool', content: result });
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`timeout: Ollama request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async executeTool(toolCall: OllamaToolCall): Promise<string> {
    const { name, arguments: args } = toolCall.function;
    if (name === 'ocr_extract') {
      const s3Url = args['s3_url'] as string;
      const extractedText = await this.processingClient.ocr(s3Url);
      return JSON.stringify({ extractedText });
    }
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }

  private parseResult(content: string): VisionExtractionResponse {
    const raw = content.trim();
    const json = raw.startsWith('```')
      ? raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim()
      : raw;
    return JSON.parse(json) as VisionExtractionResponse;
  }

  private buildPrompt(storageUrl: string, fileType: string, extractedText?: string): string {
    const context = extractedText ? `\nPre-extracted text:\n${extractedText}\n` : '';
    return `You are an architecture diagram analyzer. The diagram is at ${storageUrl} (type: ${fileType}).${context}

${extractedText ? 'Use the pre-extracted text above.' : 'First call ocr_extract to read the diagram text, then analyze it.'}

Return a JSON object with:
- extractedText: all visible text in the diagram
- elements: [{ id, label, type (microservice|database|broker|client|unknown), confidence (0-1), boundingBox { x, y, width, height } }]
- connections: [{ fromElementId, toElementId, type (sync|async|unknown), label }]

Classify connections: sync = HTTP/REST, async = Kafka/queue.
Respond with valid JSON only, no markdown.`;
  }
}
