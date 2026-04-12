import { ProcessingJob, DiagramElement, ProcessingStatus } from '../../../src/domain/entities/ProcessingJob';

describe('ProcessingJob Entity', () => {
  const validDiagramId = 'diagram-abc-123';

  const makeElements = (count = 2): DiagramElement[] =>
    Array.from({ length: count }, (_, i) => ({
      type: 'microservice' as const,
      label: `Service-${i + 1}`,
      position: { x: i * 100, y: 0 },
    }));

  describe('should create a ProcessingJob with valid diagramId', () => {
    it('creates job with provided diagramId', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      expect(job.diagramId).toBe(validDiagramId);
      expect(job.id).toBeDefined();
    });

    it('generates a unique id for each job', () => {
      const job1 = new ProcessingJob({ diagramId: validDiagramId });
      const job2 = new ProcessingJob({ diagramId: validDiagramId });

      expect(job1.id).not.toBe(job2.id);
    });

    it('uses provided id when given', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId, id: 'custom-id-999' });

      expect(job.id).toBe('custom-id-999');
    });

    it('sets createdAt close to current time', () => {
      const before = new Date();
      const job = new ProcessingJob({ diagramId: validDiagramId });
      const after = new Date();

      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(job.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('should start with status "pending"', () => {
    it('initial status is pending', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      expect(job.status).toBe('pending');
    });
  });

  describe('should transition to "processing" when started', () => {
    it('status changes to processing after start()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      job.start();

      expect(job.status).toBe('processing');
    });
  });

  describe('should transition to "processed" when completed with elements', () => {
    it('status changes to processed after complete()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });
      job.start();

      job.complete('extracted text content', makeElements());

      expect(job.status).toBe('processed');
    });

    it('stores elements after complete()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });
      const elements = makeElements(3);

      job.complete('some text', elements);

      expect(job.elements).toHaveLength(3);
      expect(job.elements[0].label).toBe('Service-1');
      expect(job.elements[1].label).toBe('Service-2');
    });

    it('stores extractedText after complete()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      job.complete('User Service -> Product Service -> Database', makeElements());

      expect(job.extractedText).toBe('User Service -> Product Service -> Database');
    });
  });

  describe('should transition to "failed" when error occurs', () => {
    it('status changes to failed after fail()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });
      job.start();

      job.fail({ code: 'AGENT_ERROR', message: 'Agent returned unexpected response' });

      expect(job.status).toBe('failed');
    });

    it('stores error details after fail()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });
      const error = { code: 'TIMEOUT', message: 'Request timed out after 30s' };

      job.fail(error);

      expect(job.error).toEqual(error);
    });
  });

  describe('should store extracted text', () => {
    it('extractedText is empty string initially', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      expect(job.extractedText).toBe('');
    });

    it('extractedText is updated after complete()', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      job.complete('API Gateway -> Auth Service -> User DB', []);

      expect(job.extractedText).toBe('API Gateway -> Auth Service -> User DB');
    });
  });

  describe('should store elements with type, label, position', () => {
    it('elements are empty array initially', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });

      expect(job.elements).toEqual([]);
    });

    it('stores elements with all fields correctly', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });
      const elements: DiagramElement[] = [
        { type: 'microservice', label: 'API Gateway', position: { x: 0, y: 0 } },
        { type: 'database', label: 'User DB', position: { x: 200, y: 100 } },
        { type: 'broker', label: 'Kafka', position: { x: 400, y: 0 } },
        { type: 'client', label: 'Frontend', position: { x: 600, y: 50 } },
        { type: 'unknown', label: 'Unknown Box', position: { x: 800, y: 0 } },
      ];

      job.complete('text', elements);

      expect(job.elements).toHaveLength(5);
      expect(job.elements[0]).toEqual({ type: 'microservice', label: 'API Gateway', position: { x: 0, y: 0 } });
      expect(job.elements[1]).toEqual({ type: 'database', label: 'User DB', position: { x: 200, y: 100 } });
      expect(job.elements[2]).toEqual({ type: 'broker', label: 'Kafka', position: { x: 400, y: 0 } });
    });

    it('elements array is immutable (returns a copy)', () => {
      const job = new ProcessingJob({ diagramId: validDiagramId });
      job.complete('text', makeElements(2));

      const elements = job.elements;
      elements.push({ type: 'unknown', label: 'injected', position: { x: 0, y: 0 } });

      expect(job.elements).toHaveLength(2);
    });
  });

  describe('should throw when diagramId is empty', () => {
    it('throws when diagramId is empty string', () => {
      expect(() => new ProcessingJob({ diagramId: '' })).toThrow('diagramId cannot be empty');
    });

    it('throws when diagramId is only whitespace', () => {
      expect(() => new ProcessingJob({ diagramId: '   ' })).toThrow('diagramId cannot be empty');
    });
  });
});
