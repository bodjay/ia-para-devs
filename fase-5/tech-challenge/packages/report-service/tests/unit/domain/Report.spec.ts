import { Report, ReportComponent, ReportRisk, ReportRecommendation, ArchitecturePattern } from '../../../src/domain/entities/Report';

const makeValidComponent = (overrides: Partial<ReportComponent> = {}): ReportComponent => ({
  name: 'api-gateway',
  type: 'microservice',
  description: 'Entry point for all client requests',
  observations: 'Single instance detected',
  ...overrides,
});

const makeValidRisk = (overrides: Partial<ReportRisk> = {}): ReportRisk => ({
  title: 'Single Point of Failure',
  description: 'The api-gateway has no replica',
  severity: 'high',
  affectedComponents: ['api-gateway'],
  ...overrides,
});

const makeValidRecommendation = (overrides: Partial<ReportRecommendation> = {}): ReportRecommendation => ({
  title: 'Add redundancy to api-gateway',
  description: 'Deploy multiple instances behind a load balancer',
  priority: 'high',
  relatedRisks: ['Single Point of Failure'],
  ...overrides,
});

const makeValidPattern = (overrides: Partial<ArchitecturePattern> = {}): ArchitecturePattern => ({
  name: 'Microservices',
  confidence: 0.92,
  description: 'Multiple independent services communicating over network',
  ...overrides,
});

describe('Report entity', () => {
  describe('creation', () => {
    it('should create a Report with valid data', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      expect(report.id).toBeDefined();
      expect(report.diagramId).toBe('diagram-001');
      expect(report.createdAt).toBeInstanceOf(Date);
    });

    it('should start with status "pending"', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      expect(report.status).toBe('pending');
    });

    it('should throw when diagramId is empty', () => {
      expect(() => new Report({ diagramId: '' })).toThrow('diagramId cannot be empty');
    });
  });

  describe('state transitions', () => {
    it('should transition to "processing" when analysis starts', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      report.startProcessing();

      expect(report.status).toBe('processing');
    });

    it('should transition to "completed" with full result', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      report.complete({
        analysisId: 'analysis-123',
        components: [makeValidComponent()],
        risks: [makeValidRisk()],
        recommendations: [makeValidRecommendation()],
        summary: 'Microservices architecture with one risk identified',
        patterns: [makeValidPattern()],
      });

      expect(report.status).toBe('completed');
      expect(report.analysisId).toBe('analysis-123');
      expect(report.summary).toBe('Microservices architecture with one risk identified');
    });

    it('should transition to "failed" with error details', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      report.fail({ code: 'ANALYSIS_FAILED', message: 'Claude API timeout' });

      expect(report.status).toBe('failed');
      expect(report.error?.code).toBe('ANALYSIS_FAILED');
      expect(report.error?.message).toBe('Claude API timeout');
    });
  });

  describe('components', () => {
    it('should store components with type and description', () => {
      const components: ReportComponent[] = [
        makeValidComponent({ name: 'api-gateway', type: 'microservice', description: 'API Gateway' }),
        makeValidComponent({ name: 'mongodb', type: 'database', description: 'Primary database' }),
        makeValidComponent({ name: 'kafka', type: 'broker', description: 'Message broker' }),
        makeValidComponent({ name: 'web-client', type: 'client', description: 'Frontend app' }),
      ];

      const report = new Report({ diagramId: 'diagram-001', components });

      expect(report.components).toHaveLength(4);
      expect(report.components[0].type).toBe('microservice');
      expect(report.components[1].type).toBe('database');
      expect(report.components[2].type).toBe('broker');
      expect(report.components[3].type).toBe('client');
    });
  });

  describe('risks', () => {
    it('should store risks with severity levels (low, medium, high)', () => {
      const risks: ReportRisk[] = [
        makeValidRisk({ title: 'SPOF', severity: 'high' }),
        makeValidRisk({ title: 'High Latency', severity: 'medium' }),
        makeValidRisk({ title: 'Missing Docs', severity: 'low' }),
      ];

      const report = new Report({ diagramId: 'diagram-001', risks });

      expect(report.risks).toHaveLength(3);
      expect(report.risks[0].severity).toBe('high');
      expect(report.risks[1].severity).toBe('medium');
      expect(report.risks[2].severity).toBe('low');
    });
  });

  describe('recommendations', () => {
    it('should store recommendations with priority', () => {
      const recommendations: ReportRecommendation[] = [
        makeValidRecommendation({ title: 'Add Load Balancer', priority: 'high' }),
        makeValidRecommendation({ title: 'Add Caching Layer', priority: 'medium' }),
        makeValidRecommendation({ title: 'Update Documentation', priority: 'low' }),
      ];

      const report = new Report({ diagramId: 'diagram-001', recommendations });

      expect(report.recommendations).toHaveLength(3);
      expect(report.recommendations[0].priority).toBe('high');
      expect(report.recommendations[1].priority).toBe('medium');
      expect(report.recommendations[2].priority).toBe('low');
    });
  });

  describe('architecture patterns', () => {
    it('should store architecture patterns with confidence', () => {
      const patterns: ArchitecturePattern[] = [
        makeValidPattern({ name: 'Microservices', confidence: 0.92 }),
        makeValidPattern({ name: 'Event-Driven', confidence: 0.75 }),
      ];

      const report = new Report({ diagramId: 'diagram-001', patterns });

      expect(report.patterns).toHaveLength(2);
      expect(report.patterns[0].name).toBe('Microservices');
      expect(report.patterns[0].confidence).toBe(0.92);
    });
  });

  describe('completedAt', () => {
    it('should set completedAt when status is "completed"', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      expect(report.completedAt).toBeUndefined();

      report.complete({
        analysisId: 'analysis-123',
        components: [],
        risks: [],
        recommendations: [],
        summary: 'Done',
        patterns: [],
      });

      expect(report.completedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when status is "failed"', () => {
      const report = new Report({ diagramId: 'diagram-001' });

      report.fail({ code: 'ERR', message: 'Failed' });

      expect(report.completedAt).toBeInstanceOf(Date);
    });
  });
});
