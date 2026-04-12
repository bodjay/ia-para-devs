import { GetAnalysisUseCase, NotFoundException } from '../../../src/application/use-cases/GetAnalysisUseCase';
import { Analysis } from '../../../src/domain/entities/Analysis';
import { AnalysisResult } from '../../../src/domain/entities/AnalysisResult';
import { Diagram } from '../../../src/domain/entities/Diagram';
import { IAnalysisRepository } from '../../../src/domain/repositories/IAnalysisRepository';

const makeDiagram = (): Diagram =>
  new Diagram({
    id: 'diag-001',
    fileName: 'system-architecture.png',
    fileType: 'image/png',
    fileSize: 204800,
    storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
  });

const makeCompletedAnalysis = (): Analysis => {
  const diagram = makeDiagram();
  const result = new AnalysisResult({
    components: [
      { name: 'API Gateway', type: 'microservice', description: 'Entry point for all requests' },
      { name: 'User Service', type: 'microservice', description: 'Handles user management' },
      { name: 'MongoDB', type: 'database', description: 'Primary data store' },
      { name: 'Kafka', type: 'broker', description: 'Message broker for async communication' },
      { name: 'Web Client', type: 'client', description: 'React frontend application' },
    ],
    risks: [
      { title: 'Single Point of Failure', description: 'API Gateway is not load balanced', severity: 'high' },
      { title: 'No Circuit Breaker', description: 'Missing resilience patterns', severity: 'medium' },
      { title: 'Missing Caching', description: 'No caching layer detected', severity: 'low' },
    ],
    recommendations: [
      { title: 'Implement Load Balancing', description: 'Add load balancer for API Gateway', priority: 'high' },
      { title: 'Add Circuit Breaker', description: 'Use Hystrix or Resilience4j', priority: 'medium' },
      { title: 'Add Redis Cache', description: 'Implement caching for frequent queries', priority: 'low' },
    ],
    summary: 'The architecture follows a microservices pattern with some resilience gaps that should be addressed.',
  });

  const analysis = new Analysis({
    analysisId: 'analysis-completed-001',
    status: 'processing',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    diagram,
  });

  analysis.complete(result);
  return analysis;
};

const makePendingAnalysis = (): Analysis =>
  new Analysis({
    analysisId: 'analysis-pending-001',
    status: 'pending',
    createdAt: new Date('2026-01-15T11:00:00Z'),
    diagram: makeDiagram(),
  });

const makeProcessingAnalysis = (): Analysis =>
  new Analysis({
    analysisId: 'analysis-processing-001',
    status: 'processing',
    createdAt: new Date('2026-01-15T12:00:00Z'),
    diagram: makeDiagram(),
  });

const makeFailedAnalysis = (): Analysis => {
  const analysis = new Analysis({
    analysisId: 'analysis-failed-001',
    status: 'processing',
    createdAt: new Date('2026-01-15T09:00:00Z'),
    diagram: makeDiagram(),
  });
  analysis.fail({ code: 'EXTRACTION_ERROR', message: 'Failed to extract diagram components' });
  return analysis;
};

const makeRepository = (
  returnValue: Analysis | null = null
): jest.Mocked<IAnalysisRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(returnValue),
});

describe('GetAnalysisUseCase', () => {
  let useCase: GetAnalysisUseCase;

  describe('should return analysis with status "completed" and full result', () => {
    it('returns completed analysis with all result fields', async () => {
      const analysis = makeCompletedAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-completed-001');

      expect(output.analysisId).toBe('analysis-completed-001');
      expect(output.status).toBe('completed');
      expect(output.result).toBeDefined();
      expect(output.completedAt).toBeDefined();
    });
  });

  describe('should return analysis with status "pending" (no result yet)', () => {
    it('returns pending analysis without result', async () => {
      const analysis = makePendingAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-pending-001');

      expect(output.analysisId).toBe('analysis-pending-001');
      expect(output.status).toBe('pending');
      expect(output.result).toBeUndefined();
      expect(output.error).toBeUndefined();
    });
  });

  describe('should return analysis with status "processing" (no result yet)', () => {
    it('returns processing analysis without result', async () => {
      const analysis = makeProcessingAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-processing-001');

      expect(output.analysisId).toBe('analysis-processing-001');
      expect(output.status).toBe('processing');
      expect(output.result).toBeUndefined();
      expect(output.error).toBeUndefined();
    });
  });

  describe('should return analysis with status "failed" and error details', () => {
    it('returns failed analysis with error details', async () => {
      const analysis = makeFailedAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-failed-001');

      expect(output.analysisId).toBe('analysis-failed-001');
      expect(output.status).toBe('failed');
      expect(output.error).toBeDefined();
      expect(output.error?.code).toBe('EXTRACTION_ERROR');
      expect(output.error?.message).toBe('Failed to extract diagram components');
      expect(output.result).toBeUndefined();
    });
  });

  describe('should throw NotFoundException when analysisId does not exist', () => {
    it('throws NotFoundException for unknown id', async () => {
      const repository = makeRepository(null);
      useCase = new GetAnalysisUseCase(repository);

      await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        /Analysis with id "non-existent-id" not found/
      );
    });
  });

  describe('should include components list in result', () => {
    it('returns components array in completed analysis result', async () => {
      const analysis = makeCompletedAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-completed-001');

      expect(output.result?.components).toBeInstanceOf(Array);
      expect(output.result?.components.length).toBe(5);
      expect(output.result?.components[0]).toMatchObject({
        name: expect.any(String),
        type: expect.stringMatching(/^(microservice|database|broker|client|unknown)$/),
        description: expect.any(String),
      });
    });
  });

  describe('should include risks with severity in result', () => {
    it('returns risks array with severity levels in completed analysis', async () => {
      const analysis = makeCompletedAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-completed-001');

      expect(output.result?.risks).toBeInstanceOf(Array);
      expect(output.result?.risks.length).toBe(3);

      const highRisk = output.result?.risks.find((r) => r.severity === 'high');
      const mediumRisk = output.result?.risks.find((r) => r.severity === 'medium');
      const lowRisk = output.result?.risks.find((r) => r.severity === 'low');

      expect(highRisk).toBeDefined();
      expect(mediumRisk).toBeDefined();
      expect(lowRisk).toBeDefined();

      output.result?.risks.forEach((risk) => {
        expect(risk).toMatchObject({
          title: expect.any(String),
          description: expect.any(String),
          severity: expect.stringMatching(/^(low|medium|high)$/),
        });
      });
    });
  });

  describe('should include recommendations with priority in result', () => {
    it('returns recommendations array with priority levels in completed analysis', async () => {
      const analysis = makeCompletedAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-completed-001');

      expect(output.result?.recommendations).toBeInstanceOf(Array);
      expect(output.result?.recommendations.length).toBe(3);

      output.result?.recommendations.forEach((rec) => {
        expect(rec).toMatchObject({
          title: expect.any(String),
          description: expect.any(String),
          priority: expect.stringMatching(/^(low|medium|high)$/),
        });
      });
    });
  });

  describe('should include summary in result', () => {
    it('returns summary string in completed analysis result', async () => {
      const analysis = makeCompletedAnalysis();
      const repository = makeRepository(analysis);
      useCase = new GetAnalysisUseCase(repository);

      const output = await useCase.execute('analysis-completed-001');

      expect(output.result?.summary).toEqual(
        'The architecture follows a microservices pattern with some resilience gaps that should be addressed.'
      );
    });
  });

  describe('should include diagram info in response', () => {
    it('returns diagram information in every status', async () => {
      const statuses = [
        makePendingAnalysis(),
        makeProcessingAnalysis(),
        makeCompletedAnalysis(),
        makeFailedAnalysis(),
      ];

      for (const analysis of statuses) {
        const repository = makeRepository(analysis);
        useCase = new GetAnalysisUseCase(repository);

        const output = await useCase.execute(analysis.analysisId);

        expect(output.diagram).toBeDefined();
        expect(output.diagram.id).toBe('diag-001');
        expect(output.diagram.fileName).toBe('system-architecture.png');
        expect(output.diagram.fileType).toBe('image/png');
        expect(output.diagram.storageUrl).toBe(
          'https://storage.example.com/diagrams/diag-001.png'
        );
      }
    });
  });

  it('should return createdAt as ISO-8601 string', async () => {
    const analysis = makePendingAnalysis();
    const repository = makeRepository(analysis);
    useCase = new GetAnalysisUseCase(repository);

    const output = await useCase.execute('analysis-pending-001');

    expect(output.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should return completedAt as ISO-8601 string when analysis is completed', async () => {
    const analysis = makeCompletedAnalysis();
    const repository = makeRepository(analysis);
    useCase = new GetAnalysisUseCase(repository);

    const output = await useCase.execute('analysis-completed-001');

    expect(output.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should call repository with the correct analysisId', async () => {
    const repository = makeRepository(null);
    useCase = new GetAnalysisUseCase(repository);
    const targetId = 'specific-analysis-id';

    try {
      await useCase.execute(targetId);
    } catch {
      // expected NotFoundException
    }

    expect(repository.findById).toHaveBeenCalledWith(targetId);
  });
});
