import { IEmbeddingFunction } from 'chromadb';

interface OllamaEmbedResponse {
  embeddings: number[][];
}

export class OllamaEmbeddingFunction implements IEmbeddingFunction {
  readonly baseUrl: string;
  readonly model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.model = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
  }

  // Uses POST /api/embed (Ollama >= 0.5.0, supports batch input)
  async generate(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `[OllamaEmbeddingFunction] Ollama returned ${response.status} for model "${this.model}". ` +
          `Run: docker exec <ollama-container> ollama pull ${this.model}. ` +
          (body ? `Ollama says: ${body}` : '')
      );
    }

    const data = (await response.json()) as OllamaEmbedResponse;
    return data.embeddings;
  }
}
