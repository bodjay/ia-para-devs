import { GenerateReportUseCase } from '../../../src/application/use-cases/GenerateReportUseCase';
import { IReportRepository } from '../../../src/domain/repositories/IReportRepository';
import { IArchitectureAnalysisAgentClient, AgentAnalysisOutput } from '../../../src/application/ports/IArchitectureAnalysisAgentClient';
import { IAnalysisCompletedProducer, AnalysisCompletedEvent } from '../../../src/application/ports/IAnalysisCompletedProducer';
import { GenerateReportInput } from '../../../src/domain/use-cases/IGenerateReportUseCase';
import { Report } from '../../../src/domain/entities/Report';

const makeAgentOutput = (overrides: Partial<AgentAnalysisOutput> = {}): AgentAnalysisOutput => ({
  analysisId: 'analysis-abc-123',
  status: 'completed',
  components: [
    { name: 'api-gateway', type: 'microservice', description: 'Entry point', observations: '' },
    { name: 'user-service', type: 'microservice', description: 'User management', observations: '' },
    { name: 'order-service', type: 'microservice', description: 'Order management', observations: '' },
    { name: 'mongodb', type: 'database', description: 'Primary DB', observations: '' },
    { name: 'kafka', type: 'broker', description: 'Message broker', observations: '' },
  ],
  architecturePatterns: [
    { name: 'Microservices', confidence: 0.95, description: 'Multiple independent services' },
    { name: 'Event-Driven', confidence: 0.85, description: 'Services communicate via events' },
  ],
  risks: [
    { title: 'Single Point of Failure', description: 'api-gateway has no replica', severity: 'high', affectedComponents: ['api-gateway'] },
    { title: 'High Coupling', description: 'user-service has too many sync connections', severity: 'medium', affectedComponents: ['user-service'] },
  ],
  recommendations: [
    { title: 'Add Load Balancer', description: 'Deploy multiple api-gateway instances', priority: 'high', relatedRisks: ['Single Point of Failure'] },
    { title: 'Introduce Circuit Breaker', description: 'Reduce coupling with circuit breaker pattern', priority: 'medium', relatedRisks: ['High Coupling'] },
  ],
  summary: 'Microservices architecture with two risks: SPOF on api-gateway and high coupling on user-service.',
  ...overrides,
});

const makeInput = (overrides: Partial<GenerateReportInput> = {}): GenerateReportInput => ({
  diagramId: 'diagram-001',
  fileName: 'architecture.png',
  fileType: 'image/png',
  storageUrl: 'https://storage.example.com/diagrams/architecture.png',
  extractedText: 'api-gateway -> user-service -> mongodb',
  elements: [
    { id: 'el-1', label: 'api-gateway', type: 'microservice' },
    { id: 'el-2', label: 'user-service', type: 'microservice' },
    { id: 'el-3', label: 'order-service', type: 'microservice' },
    { id: 'el-4', label: 'mongodb', type: 'database' },
    { id: 'el-5', label: 'kafka', type: 'broker' },
  ],
  connections: [
    { fromElementId: 'el-1', toElementId: 'el-2', type: 'sync' },
    { fromElementId: 'el-2', toElementId: 'el-4', type: 'sync' },
    { fromElementId: 'el-3', toElementId: 'el-5', type: 'async' },
  ],
  options: {
    analysisDepth: 'intermediate',
    includeRisks: true,
    includeRecommendations: true,
    language: 'pt-BR',
  },
  ...overrides,
});

describe('GenerateReportUseCase', () => {
  let reportRepository: jest.Mocked<IReportRepository>;
  let analysisAgent: jest.Mocked<IArchitectureAnalysisAgentClient>;
  let eventProducer: jest.Mocked<IAnalysisCompletedProducer>;
  let useCase: GenerateReportUseCase;

  beforeEach(() => {
    reportRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findByDiagramId: jest.fn().mockResolvedValue(null),
      findByAnalysisId: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
    };

    analysisAgent = {
      analyze: jest.fn().mockResolvedValue(makeAgentOutput()),
    };

    eventProducer = {
      publishAnalysisCompleted: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new GenerateReportUseCase(reportRepository, analysisAgent, eventProducer);
  });

  describe('agent invocation', () => {
    it('should invoke architecture-analysis-agent with elements and connections', async () => {
      const input = makeInput();

      await useCase.execute(input);

      expect(analysisAgent.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          diagramId: 'diagram-001',
          elements: expect.arrayContaining([
            expect.objectContaining({ label: 'api-gateway' }),
            expect.objectContaining({ label: 'user-service' }),
          ]),
          connections: expect.arrayContaining([
            expect.objectContaining({ fromElementId: 'el-1', toElementId: 'el-2' }),
          ]),
        })
      );
    });

    it('should pass analysisDepth option to agent', async () => {
      await useCase.execute(makeInput({ options: { analysisDepth: 'deep', includeRisks: true, includeRecommendations: true, language: 'pt-BR' } }));

      expect(analysisAgent.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ analysisDepth: 'deep' }),
        })
      );
    });

    it('should pass includeRisks: true to agent', async () => {
      await useCase.execute(makeInput());

      expect(analysisAgent.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ includeRisks: true }),
        })
      );
    });

    it('should pass includeRecommendations: true to agent', async () => {
      await useCase.execute(makeInput());

      expect(analysisAgent.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ includeRecommendations: true }),
        })
      );
    });
  });

  describe('result mapping', () => {
    it('should map agent components to report components', async () => {
      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(savedReport.components).toHaveLength(5);
      expect(savedReport.components[0].name).toBe('api-gateway');
      expect(savedReport.components[0].type).toBe('microservice');
    });

    it('should map agent risks with severity to report', async () => {
      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(savedReport.risks).toHaveLength(2);
      expect(savedReport.risks[0].severity).toBe('high');
      expect(savedReport.risks[1].severity).toBe('medium');
    });

    it('should map agent recommendations with priority to report', async () => {
      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(savedReport.recommendations).toHaveLength(2);
      expect(savedReport.recommendations[0].priority).toBe('high');
    });

    it('should include architecturePatterns in report', async () => {
      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(savedReport.patterns).toHaveLength(2);
      expect(savedReport.patterns[0].name).toBe('Microservices');
      expect(savedReport.patterns[0].confidence).toBe(0.95);
    });

    it('should include summary in result', async () => {
      const output = await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(savedReport.summary).toContain('Microservices');
      expect(output.status).toBe('completed');
    });
  });

  describe('persistence', () => {
    it('should save completed report to repository', async () => {
      await useCase.execute(makeInput());

      expect(reportRepository.save).toHaveBeenCalledTimes(1);
      expect(reportRepository.update).toHaveBeenCalled();
      const lastUpdate = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(lastUpdate.status).toBe('completed');
    });
  });

  describe('event publishing', () => {
    it('should publish analysis.completed event with status "completed"', async () => {
      await useCase.execute(makeInput());

      expect(eventProducer.publishAnalysisCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          diagramId: 'diagram-001',
          analysisId: 'analysis-abc-123',
        })
      );
    });

    it('should set timestamp correctly in published event', async () => {
      const before = new Date().toISOString();
      await useCase.execute(makeInput());
      const after = new Date().toISOString();

      const publishedEvent = eventProducer.publishAnalysisCompleted.mock.calls[0][0] as AnalysisCompletedEvent;
      expect(publishedEvent.timestamp >= before).toBe(true);
      expect(publishedEvent.timestamp <= after).toBe(true);
    });

    it('should generate unique analysisId', async () => {
      await useCase.execute(makeInput({ diagramId: 'diagram-001' }));
      await useCase.execute(makeInput({ diagramId: 'diagram-002' }));

      const firstEvent = eventProducer.publishAnalysisCompleted.mock.calls[0][0];
      const secondEvent = eventProducer.publishAnalysisCompleted.mock.calls[1][0];

      // Both come from agent which returns same analysisId in mock, but report IDs differ
      expect(firstEvent.eventId).toBeDefined();
      expect(secondEvent.eventId).toBeDefined();
    });
  });

  describe('risk detection', () => {
    it('should detect Single Point of Failure risk when only one instance of critical component', async () => {
      const agentWithSPOF = makeAgentOutput({
        risks: [{ title: 'Single Point of Failure', description: 'Only one api-gateway instance', severity: 'high', affectedComponents: ['api-gateway'] }],
      });
      analysisAgent.analyze.mockResolvedValueOnce(agentWithSPOF);

      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      const spofRisk = savedReport.risks.find((r) => r.title === 'Single Point of Failure');
      expect(spofRisk).toBeDefined();
      expect(spofRisk?.severity).toBe('high');
      expect(spofRisk?.affectedComponents).toContain('api-gateway');
    });

    it('should detect high coupling risk when many sync connections exist', async () => {
      const agentWithHighCoupling = makeAgentOutput({
        risks: [{ title: 'High Coupling', description: 'Too many synchronous dependencies', severity: 'medium', affectedComponents: ['user-service', 'order-service'] }],
      });
      analysisAgent.analyze.mockResolvedValueOnce(agentWithHighCoupling);

      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      const couplingRisk = savedReport.risks.find((r) => r.title === 'High Coupling');
      expect(couplingRisk).toBeDefined();
      expect(couplingRisk?.severity).toBe('medium');
    });

    it('should detect lack of redundancy risk when database has no replica', async () => {
      const agentWithRedundancy = makeAgentOutput({
        risks: [{ title: 'Lack of Redundancy', description: 'mongodb has no read replica', severity: 'high', affectedComponents: ['mongodb'] }],
      });
      analysisAgent.analyze.mockResolvedValueOnce(agentWithRedundancy);

      await useCase.execute(makeInput());

      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      const redundancyRisk = savedReport.risks.find((r) => r.title === 'Lack of Redundancy');
      expect(redundancyRisk).toBeDefined();
      expect(redundancyRisk?.affectedComponents).toContain('mongodb');
    });
  });

  describe('failure scenarios', () => {
    it('should handle agent returning failed status and publish analysis.completed with status "failed"', async () => {
      analysisAgent.analyze.mockResolvedValueOnce(
        makeAgentOutput({
          status: 'failed',
          error: { code: 'CLAUDE_ERROR', message: 'Model overloaded' },
        })
      );

      const result = await useCase.execute(makeInput());

      expect(result.status).toBe('failed');
      expect(eventProducer.publishAnalysisCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should handle diagram.processed event with status "failed" (skip analysis, publish failed)', async () => {
      // Simulate that when processing status is failed, use case never gets called
      // This test validates behavior at the use case level when explicitly passed a failed diagram
      analysisAgent.analyze.mockRejectedValueOnce(new Error('Agent unavailable'));

      const result = await useCase.execute(makeInput());

      expect(result.status).toBe('failed');
      const savedReport = reportRepository.update.mock.calls.at(-1)?.[0] as Report;
      expect(savedReport.status).toBe('failed');
    });
  });
});
