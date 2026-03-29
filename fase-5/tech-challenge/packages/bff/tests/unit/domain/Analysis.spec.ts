import { Analysis, AnalysisStatus, VALID_STATUSES } from '../../../src/domain/entities/Analysis';
import { AnalysisResult } from '../../../src/domain/entities/AnalysisResult';
import { Diagram } from '../../../src/domain/entities/Diagram';

const makeDiagram = (): Diagram =>
  new Diagram({
    id: 'diag-001',
    fileName: 'architecture.png',
    fileType: 'image/png',
    fileSize: 204800,
    storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
  });

const makeAnalysis = (overrides?: Partial<ConstructorParameters<typeof Analysis>[0]>): Analysis =>
  new Analysis({
    analysisId: 'analysis-abc-123',
    status: 'pending',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    diagram: makeDiagram(),
    ...overrides,
  });

describe('Analysis Entity', () => {
  describe('creation', () => {
    it('should create an analysis with valid data', () => {
      const analysis = makeAnalysis();

      expect(analysis.analysisId).toBe('analysis-abc-123');
      expect(analysis.status).toBe('pending');
      expect(analysis.createdAt).toEqual(new Date('2026-01-15T10:00:00Z'));
      expect(analysis.diagram).toBeDefined();
      expect(analysis.result).toBeUndefined();
      expect(analysis.error).toBeUndefined();
      expect(analysis.completedAt).toBeUndefined();
    });

    it('should create an analysis with all optional fields', () => {
      const result = new AnalysisResult({
        components: [{ name: 'API Gateway', type: 'microservice', description: 'Entry point' }],
        risks: [{ title: 'SPOF', description: 'Single point of failure', severity: 'high' }],
        recommendations: [{ title: 'Add redundancy', description: 'Use multiple instances', priority: 'high' }],
        summary: 'Architecture looks good overall.',
      });

      const analysis = makeAnalysis({
        status: 'completed',
        completedAt: new Date('2026-01-15T10:01:00Z'),
        result,
      });

      expect(analysis.status).toBe('completed');
      expect(analysis.completedAt).toEqual(new Date('2026-01-15T10:01:00Z'));
      expect(analysis.result).toBe(result);
    });

    it('should throw when analysisId is empty', () => {
      expect(() => makeAnalysis({ analysisId: '' })).toThrow('analysisId is required');
    });

    it('should throw when analysisId is whitespace', () => {
      expect(() => makeAnalysis({ analysisId: '   ' })).toThrow('analysisId is required');
    });

    it('should throw when status is invalid', () => {
      expect(() =>
        makeAnalysis({ status: 'invalid-status' as AnalysisStatus })
      ).toThrow(/Invalid status/);
    });

    it('should accept all valid statuses on creation', () => {
      for (const status of VALID_STATUSES) {
        const analysis = makeAnalysis({ status });
        expect(analysis.status).toBe(status);
      }
    });
  });

  describe('status transitions', () => {
    it('should transition from "pending" to "processing"', () => {
      const analysis = makeAnalysis({ status: 'pending' });
      analysis.transitionTo('processing');
      expect(analysis.status).toBe('processing');
    });

    it('should transition from "pending" to "failed"', () => {
      const analysis = makeAnalysis({ status: 'pending' });
      analysis.transitionTo('failed');
      expect(analysis.status).toBe('failed');
    });

    it('should transition from "processing" to "completed"', () => {
      const analysis = makeAnalysis({ status: 'processing' });
      analysis.transitionTo('completed');
      expect(analysis.status).toBe('completed');
    });

    it('should transition from "processing" to "failed"', () => {
      const analysis = makeAnalysis({ status: 'processing' });
      analysis.transitionTo('failed');
      expect(analysis.status).toBe('failed');
    });

    it('should throw on invalid transition from "pending" to "completed"', () => {
      const analysis = makeAnalysis({ status: 'pending' });
      expect(() => analysis.transitionTo('completed')).toThrow(
        /Invalid status transition from "pending" to "completed"/
      );
    });

    it('should throw on invalid transition from "completed" to any status', () => {
      const analysis = makeAnalysis({ status: 'completed' });
      expect(() => analysis.transitionTo('processing')).toThrow(/Invalid status transition/);
      expect(() => analysis.transitionTo('failed')).toThrow(/Invalid status transition/);
      expect(() => analysis.transitionTo('pending')).toThrow(/Invalid status transition/);
    });

    it('should throw on invalid transition from "failed" to any status', () => {
      const analysis = makeAnalysis({ status: 'failed' });
      expect(() => analysis.transitionTo('pending')).toThrow(/Invalid status transition/);
      expect(() => analysis.transitionTo('processing')).toThrow(/Invalid status transition/);
      expect(() => analysis.transitionTo('completed')).toThrow(/Invalid status transition/);
    });
  });

  describe('complete()', () => {
    it('should complete the analysis and set result and completedAt', () => {
      const analysis = makeAnalysis({ status: 'processing' });
      const result = new AnalysisResult({
        components: [],
        risks: [],
        recommendations: [],
        summary: 'All good.',
      });

      analysis.complete(result);

      expect(analysis.status).toBe('completed');
      expect(analysis.result).toBe(result);
      expect(analysis.completedAt).toBeInstanceOf(Date);
    });

    it('should throw when trying to complete from "pending" status', () => {
      const analysis = makeAnalysis({ status: 'pending' });
      const result = new AnalysisResult({ components: [], risks: [], recommendations: [], summary: '' });
      expect(() => analysis.complete(result)).toThrow(/Invalid status transition/);
    });
  });

  describe('fail()', () => {
    it('should fail the analysis and set error and completedAt', () => {
      const analysis = makeAnalysis({ status: 'processing' });

      analysis.fail({ code: 'PROCESSING_ERROR', message: 'Failed to process diagram' });

      expect(analysis.status).toBe('failed');
      expect(analysis.error).toEqual({ code: 'PROCESSING_ERROR', message: 'Failed to process diagram' });
      expect(analysis.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('startProcessing()', () => {
    it('should move analysis from "pending" to "processing"', () => {
      const analysis = makeAnalysis({ status: 'pending' });
      analysis.startProcessing();
      expect(analysis.status).toBe('processing');
    });
  });

  describe('toJSON()', () => {
    it('should serialize analysis to plain object', () => {
      const analysis = makeAnalysis();
      const json = analysis.toJSON();

      expect(json.analysisId).toBe('analysis-abc-123');
      expect(json.status).toBe('pending');
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.diagram).toBeDefined();
    });
  });
});
