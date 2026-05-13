import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { ReportChunker } from '../../domain/services/ReportChunker';
import { VectorizationInput } from '../ports/IVectorizationEvent';

export class VectorizeReportUseCase {
  private readonly chunker = new ReportChunker();

  constructor(private readonly repository: IVectorRepository) {}

  async execute(input: VectorizationInput): Promise<void> {
    const chunks = this.chunker.chunk(input);
    await this.repository.upsertChunks(chunks);
    console.log(`[VectorizeReportUseCase] Upserted ${chunks.length} chunks for diagramId ${input.diagramId}`);
  }
}
