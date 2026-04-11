import { IVisionClient, VisionExtractionResponse } from './IVisionClient';

export class OllamaVisionClient implements IVisionClient {
  constructor(
    private readonly baseUrl: string = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    private readonly model: string = process.env.OLLAMA_MODEL ?? 'llava',
    private readonly timeoutMs: number = 60000
  ) {}

  async extractFromUrl(
    storageUrl: string,
    fileType: string,
    extractedText?: string
  ): Promise<VisionExtractionResponse> {
    const base64Image = await this.fetchImageAsBase64(storageUrl);
    const prompt = this.buildExtractionPrompt(fileType, extractedText);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt, images: [base64Image] }],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned status ${response.status}`);
      }

      const data = (await response.json()) as { message: { content: string } };
      return JSON.parse(data.message.content) as VisionExtractionResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`timeout: Ollama request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchImageAsBase64(storageUrl: string): Promise<string> {
    const response = await fetch(storageUrl);
    if (!response.ok) {
      throw new Error(`Invalid URL: failed to fetch image from ${storageUrl}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
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
Classify connections as sync (direct HTTP/REST) or async (Kafka/queue-based).
Respond with valid JSON only.`;
  }
}
