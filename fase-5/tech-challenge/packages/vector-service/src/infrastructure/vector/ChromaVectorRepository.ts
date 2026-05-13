import { ChromaClient, Collection } from 'chromadb';
import { IVectorRepository, SearchResult } from '../../domain/repositories/IVectorRepository';
import { ReportChunk, ReportChunkMetadata } from '../../domain/entities/ReportChunk';
import { OllamaEmbeddingFunction } from '../embeddings/OllamaEmbeddingFunction';

const COLLECTION_NAME = 'arch_reports';
const BATCH_SIZE = 100;

export class ChromaVectorRepository implements IVectorRepository {
  private readonly client: ChromaClient;
  private readonly embedFn: OllamaEmbeddingFunction;
  private collection: Collection | null = null;

  constructor() {
    const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
    this.client = new ChromaClient({ path: chromaUrl });
    this.embedFn = new OllamaEmbeddingFunction();
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collection) {
      this.collection = await this.client.getOrCreateCollection({
        name: COLLECTION_NAME,
        embeddingFunction: this.embedFn,
        metadata: { 'hnsw:space': 'cosine' },
      });
    }
    return this.collection;
  }

  async upsertChunks(chunks: ReportChunk[]): Promise<void> {
    const collection = await this.getCollection();

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await collection.upsert({
        ids: batch.map((c) => c.id),
        documents: batch.map((c) => c.text),
        metadatas: batch.map((c) => c.metadata as unknown as Record<string, string>),
      });
    }
  }

  async search(queryText: string, limit: number): Promise<SearchResult[]> {
    const collection = await this.getCollection();

    const results = await collection.query({
      queryTexts: [queryText],
      nResults: limit,
    });

    const ids = results.ids[0] ?? [];
    const documents = results.documents[0] ?? [];
    const metadatas = results.metadatas[0] ?? [];
    const distances = results.distances?.[0] ?? [];

    return ids
      .map((_, i) => {
        const meta = (metadatas[i] ?? {}) as unknown as ReportChunkMetadata;
        return {
          text: documents[i] ?? '',
          chunkType: meta.chunkType ?? 'summary',
          diagramId: meta.diagramId ?? '',
          score: distances[i] ?? 1,
        };
      })
      .filter((r) => r.score <= 0.6);
  }

  async deleteByDiagramId(diagramId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.delete({ where: { diagramId } });
  }
}
