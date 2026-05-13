export type ChunkType = 'summary' | 'component' | 'risk' | 'recommendation';

export interface ReportChunkMetadata {
  diagramId: string;
  analysisId: string;
  chunkType: ChunkType;
  itemTitle?: string;
  severity?: string;
  priority?: string;
  createdAt: string;
}

export interface ReportChunk {
  id: string;
  text: string;
  metadata: ReportChunkMetadata;
}
