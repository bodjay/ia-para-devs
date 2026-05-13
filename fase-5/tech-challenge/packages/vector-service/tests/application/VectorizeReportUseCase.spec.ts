import { VectorizeReportUseCase } from '../../src/application/use-cases/VectorizeReportUseCase';
import { IVectorRepository } from '../../src/domain/repositories/IVectorRepository';
import { ReportChunk } from '../../src/domain/entities/ReportChunk';

const mockRepository: jest.Mocked<IVectorRepository> = {
  upsertChunks: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue([]),
  deleteByDiagramId: jest.fn().mockResolvedValue(undefined),
};

describe('VectorizeReportUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates chunks and calls upsertChunks', async () => {
    const useCase = new VectorizeReportUseCase(mockRepository);
    await useCase.execute({
      diagramId: 'diag-1',
      analysisId: 'anal-1',
      summary: 'Test architecture',
      components: [{ name: 'DB', type: 'database', description: 'Primary database' }],
      risks: [],
      recommendations: [],
    });

    expect(mockRepository.upsertChunks).toHaveBeenCalledTimes(1);
    const [chunks] = mockRepository.upsertChunks.mock.calls[0] as [ReportChunk[]];
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.metadata.chunkType === 'summary')).toBe(true);
    expect(chunks.some((c) => c.metadata.chunkType === 'component')).toBe(true);
  });
});
