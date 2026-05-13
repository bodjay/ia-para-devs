export interface VectorSearchResult {
  text: string;
  chunkType: string;
  diagramId: string;
  score: number;
}

interface VectorSearchResponse {
  results: VectorSearchResult[];
}

export class VectorServiceClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.VECTOR_SERVICE_URL ?? 'http://localhost:3006';
    this.timeoutMs = parseInt(process.env.VECTOR_SERVICE_TIMEOUT_MS ?? '10000', 10);
  }

  async search(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}/tools/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        console.warn(`[VectorServiceClient] Search returned ${response.status}, returning empty`);
        return [];
      }

      const data = (await response.json()) as VectorSearchResponse;
      return data.results ?? [];
    } catch (err) {
      console.warn('[VectorServiceClient] Search failed, continuing without context:', (err as Error).message);
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
