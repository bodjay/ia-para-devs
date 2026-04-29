import { AnalyzeArchitectureUseCase } from '../../../src/application/use-cases/AnalyzeArchitectureUseCase';
import { IAnalysisClient, AnalysisResponse } from '../../../src/infrastructure/ai/IAnalysisClient';
import { ReportServiceClient } from '../../../src/infrastructure/tools/ReportServiceClient';
import { AnalyzeArchitectureInput } from '../../../src/domain/use-cases/IAnalyzeArchitectureUseCase';

const makeAnalysisResponse = (overrides: Partial<AnalysisResponse> = {}): AnalysisResponse => ({
  components: [
    { name: 'api-gateway', type: 'microservice', description: 'Entry point for all client requests', observations: 'Single instance, no replica detected' },
    { name: 'user-service', type: 'microservice', description: 'Manages user accounts and authentication', observations: 'High number of sync dependencies' },
    { name: 'order-service', type: 'microservice', description: 'Handles order lifecycle', observations: 'Communicates asynchronously with kafka' },
    { name: 'mongodb', type: 'database', description: 'Primary persistence store', observations: 'No read replica configured' },
    { name: 'kafka', type: 'broker', description: 'Async message broker for event-driven communication', observations: '' },
    { name: 'web-client', type: 'client', description: 'Browser-based frontend application', observations: '' },
  ],
  architecturePatterns: [
    { name: 'Microservices', confidence: 0.95, description: 'Multiple independent services deployed separately' },
    { name: 'Event-Driven Architecture', confidence: 0.85, description: 'Services communicate via Kafka events' },
  ],
  risks: [
    { title: 'Single Point of Failure', description: 'api-gateway has no replica', severity: 'high', affectedComponents: ['api-gateway'] },
    { title: 'High Coupling', description: 'user-service has too many synchronous dependencies', severity: 'medium', affectedComponents: ['user-service', 'order-service'] },
    { title: 'Lack of Redundancy', description: 'mongodb has no read replica', severity: 'high', affectedComponents: ['mongodb'] },
  ],
  recommendations: [
    { title: 'Add Load Balancer', description: 'Deploy multiple api-gateway instances behind a load balancer', priority: 'high', relatedRisks: ['Single Point of Failure'] },
    { title: 'Implement Circuit Breaker', description: 'Use circuit breaker pattern to reduce coupling', priority: 'medium', relatedRisks: ['High Coupling'] },
    { title: 'Add MongoDB Read Replica', description: 'Configure a replica set for high availability', priority: 'high', relatedRisks: ['Lack of Redundancy'] },
  ],
  summary: 'A microservices architecture with 4 services, 1 database, and 1 message broker. Event-Driven Architecture pattern detected via Kafka. Three risks identified: SPOF on api-gateway, high coupling on user-service, and lack of redundancy on mongodb.',
  ...overrides,
});

const makeBaseInput = (overrides: Partial<AnalyzeArchitectureInput['payload']> = {}): AnalyzeArchitectureInput => ({
  action: 'analyze',
  payload: {
    diagramId: 'diagram-001',
    elements: [
      { id: 'el-1', label: 'api-gateway', type: 'microservice' },
      { id: 'el-2', label: 'user-service', type: 'microservice' },
      { id: 'el-3', label: 'order-service', type: 'microservice' },
      { id: 'el-4', label: 'mongodb', type: 'database' },
      { id: 'el-5', label: 'kafka', type: 'broker' },
      { id: 'el-6', label: 'web-client', type: 'client' },
    ],
    connections: [
      { fromElementId: 'el-6', toElementId: 'el-1', type: 'sync' },
      { fromElementId: 'el-1', toElementId: 'el-2', type: 'sync' },
      { fromElementId: 'el-1', toElementId: 'el-3', type: 'sync' },
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
  },
});

describe('AnalyzeArchitectureUseCase', () => {
  let analysisClient: jest.Mocked<IAnalysisClient>;
  let reportClient: jest.Mocked<ReportServiceClient>;
  let useCase: AnalyzeArchitectureUseCase;

  beforeEach(() => {
    analysisClient = {
      analyze: jest.fn().mockResolvedValue(makeAnalysisResponse()),
    } as unknown as jest.Mocked<IAnalysisClient>;

    reportClient = {
      storeReport: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ReportServiceClient>;

    useCase = new AnalyzeArchitectureUseCase(analysisClient, reportClient);
  });

  describe('analysis depth', () => {
    it('should analyze architecture with basic depth and return components', async () => {
      const input = makeBaseInput({ options: { analysisDepth: 'basic', includeRisks: true, includeRecommendations: true, language: 'pt-BR' } });

      const result = await useCase.execute(input);

      expect(analysisClient.analyze).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ analysisDepth: 'basic' })
      );
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should analyze with intermediate depth and include patterns', async () => {
      const result = await useCase.execute(makeBaseInput());

      expect(result.architecturePatterns.length).toBeGreaterThan(0);
      expect(analysisClient.analyze).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ analysisDepth: 'intermediate' })
      );
    });

    it('should analyze with deep depth and include detailed observations', async () => {
      const deepResponse = makeAnalysisResponse({
        components: [
          { name: 'api-gateway', type: 'microservice', description: 'Entry point', observations: 'Detailed: No rate limiting, no circuit breaker, single instance' },
        ],
      });
      analysisClient.analyze.mockResolvedValueOnce(deepResponse);

      const input = makeBaseInput({ options: { analysisDepth: 'deep', includeRisks: true, includeRecommendations: true, language: 'pt-BR' } });
      const result = await useCase.execute(input);

      expect(result.components[0].observations).toContain('Detailed:');
    });
  });

  describe('architecture pattern detection', () => {
    it('should detect microservice architecture pattern', async () => {
      const result = await useCase.execute(makeBaseInput());

      const microservicesPattern = result.architecturePatterns.find((p) => p.name === 'Microservices');
      expect(microservicesPattern).toBeDefined();
      expect(microservicesPattern?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect event-driven architecture pattern when broker is present', async () => {
      const result = await useCase.execute(makeBaseInput());

      const eventDrivenPattern = result.architecturePatterns.find((p) => p.name === 'Event-Driven Architecture');
      expect(eventDrivenPattern).toBeDefined();
      expect(eventDrivenPattern?.confidence).toBeGreaterThan(0.7);
    });

    it('should detect monolith pattern when single service without broker', async () => {
      const monolithResponse = makeAnalysisResponse({
        architecturePatterns: [
          { name: 'Monolith', confidence: 0.9, description: 'Single deployable unit handling all concerns' },
        ],
      });
      analysisClient.analyze.mockResolvedValueOnce(monolithResponse);

      const monolithInput = makeBaseInput({
        elements: [{ id: 'el-1', label: 'monolith-app', type: 'microservice' }],
        connections: [],
      });
      const result = await useCase.execute(monolithInput);

      const monolithPattern = result.architecturePatterns.find((p) => p.name === 'Monolith');
      expect(monolithPattern).toBeDefined();
    });
  });

  describe('risk identification', () => {
    it('should identify Single Point of Failure when only one database with no replica', async () => {
      const result = await useCase.execute(makeBaseInput());

      const spofRisk = result.risks.find((r) => r.title === 'Single Point of Failure');
      expect(spofRisk).toBeDefined();
      expect(spofRisk?.severity).toBe('high');
      expect(spofRisk?.affectedComponents).toContain('api-gateway');
    });

    it('should identify high coupling risk when many sync connections from one service', async () => {
      const result = await useCase.execute(makeBaseInput());

      const couplingRisk = result.risks.find((r) => r.title === 'High Coupling');
      expect(couplingRisk).toBeDefined();
      expect(couplingRisk?.severity).toBe('medium');
      expect(couplingRisk?.affectedComponents).toContain('user-service');
    });

    it('should identify lack of redundancy risk for critical components', async () => {
      const result = await useCase.execute(makeBaseInput());

      const redundancyRisk = result.risks.find((r) => r.title === 'Lack of Redundancy');
      expect(redundancyRisk).toBeDefined();
      expect(redundancyRisk?.affectedComponents).toContain('mongodb');
    });

    it('should include affectedComponents in risks', async () => {
      const result = await useCase.execute(makeBaseInput());

      result.risks.forEach((risk) => {
        expect(risk.affectedComponents).toBeDefined();
        expect(Array.isArray(risk.affectedComponents)).toBe(true);
      });
    });
  });

  describe('recommendations', () => {
    it('should generate recommendations for each identified risk', async () => {
      const result = await useCase.execute(makeBaseInput());

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBe(result.risks.length);
    });

    it('should recommend circuit breaker when high coupling detected', async () => {
      const result = await useCase.execute(makeBaseInput());

      const cbRec = result.recommendations.find((r) => r.title === 'Implement Circuit Breaker');
      expect(cbRec).toBeDefined();
      expect(cbRec?.priority).toBe('medium');
      expect(cbRec?.relatedRisks).toContain('High Coupling');
    });

    it('should recommend database replica when SPOF detected', async () => {
      const result = await useCase.execute(makeBaseInput());

      const replicaRec = result.recommendations.find((r) => r.title === 'Add MongoDB Read Replica');
      expect(replicaRec).toBeDefined();
      expect(replicaRec?.priority).toBe('high');
      expect(replicaRec?.relatedRisks).toContain('Lack of Redundancy');
    });
  });

  describe('output structure', () => {
    it('should include summary describing overall architecture', async () => {
      const result = await useCase.execute(makeBaseInput());

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
      expect(result.summary).toContain('microservices');
    });

    it('should return status "completed" on success', async () => {
      const result = await useCase.execute(makeBaseInput());

      expect(result.status).toBe('completed');
    });

    it('should include confidence score for each detected pattern', async () => {
      const result = await useCase.execute(makeBaseInput());

      result.architecturePatterns.forEach((pattern) => {
        expect(typeof pattern.confidence).toBe('number');
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should generate unique analysisId', async () => {
      const result1 = await useCase.execute(makeBaseInput());
      const result2 = await useCase.execute(makeBaseInput());

      expect(result1.analysisId).not.toBe(result2.analysisId);
    });
  });

  describe('report tool call', () => {
    it('should call storeReport after successful analysis', async () => {
      await useCase.execute(makeBaseInput());

      expect(reportClient.storeReport).toHaveBeenCalledTimes(1);
    });

    it('should call storeReport even when analysis fails', async () => {
      analysisClient.analyze.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await useCase.execute(makeBaseInput());

      expect(result.status).toBe('failed');
      expect(reportClient.storeReport).toHaveBeenCalledTimes(1);
    });

    it('should not throw when storeReport fails', async () => {
      reportClient.storeReport.mockRejectedValueOnce(new Error('report-service unreachable'));

      await expect(useCase.execute(makeBaseInput())).resolves.toBeDefined();
    });
  });

  describe('failure scenarios', () => {
    it('should return status "failed" when analysis client fails', async () => {
      analysisClient.analyze.mockRejectedValueOnce(new Error('Claude API unavailable'));

      const result = await useCase.execute(makeBaseInput());

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('Claude API unavailable');
    });

    it('should handle empty elements list gracefully', async () => {
      const emptyResponse = makeAnalysisResponse({
        components: [],
        architecturePatterns: [],
        risks: [],
        recommendations: [],
        summary: 'No components detected in the diagram.',
      });
      analysisClient.analyze.mockResolvedValueOnce(emptyResponse);

      const input = makeBaseInput({ elements: [], connections: [] });
      const result = await useCase.execute(input);

      expect(result.status).toBe('completed');
      expect(result.components).toHaveLength(0);
      expect(result.summary).toContain('No components');
    });
  });

  describe('options behavior', () => {
    it('should respect language option in output', async () => {
      const ptBRResponse = makeAnalysisResponse({ summary: 'Arquitetura de microsserviços com três riscos identificados.' });
      analysisClient.analyze.mockResolvedValueOnce(ptBRResponse);

      const result = await useCase.execute(
        makeBaseInput({ options: { analysisDepth: 'intermediate', includeRisks: true, includeRecommendations: true, language: 'pt-BR' } })
      );

      expect(analysisClient.analyze).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ language: 'pt-BR' })
      );
      expect(result.summary).toContain('Arquitetura');
    });

    it('should skip risks when includeRisks is false', async () => {
      const noRisksResponse = makeAnalysisResponse({ risks: [] });
      analysisClient.analyze.mockResolvedValueOnce(noRisksResponse);

      const input = makeBaseInput({ options: { analysisDepth: 'intermediate', includeRisks: false, includeRecommendations: true, language: 'pt-BR' } });
      const result = await useCase.execute(input);

      expect(result.risks).toHaveLength(0);
    });

    it('should skip recommendations when includeRecommendations is false', async () => {
      const noRecsResponse = makeAnalysisResponse({ recommendations: [] });
      analysisClient.analyze.mockResolvedValueOnce(noRecsResponse);

      const input = makeBaseInput({ options: { analysisDepth: 'intermediate', includeRisks: true, includeRecommendations: false, language: 'pt-BR' } });
      const result = await useCase.execute(input);

      expect(result.recommendations).toHaveLength(0);
    });
  });
});
