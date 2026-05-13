import { ReportChunk } from '../entities/ReportChunk';

export interface SearchResult {
  text: string;
  chunkType: string;
  diagramId: string;
  score: number;
}

export interface IVectorRepository {
  upsertChunks(chunks: ReportChunk[]): Promise<void>;
  search(queryText: string, limit: number): Promise<SearchResult[]>;
  deleteByDiagramId(diagramId: string): Promise<void>;
}
