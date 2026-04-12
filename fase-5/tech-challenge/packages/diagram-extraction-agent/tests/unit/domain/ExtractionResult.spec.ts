import { ExtractionResult, ElementConnection } from '../../../src/domain/entities/ExtractionResult';
import { DiagramElement } from '../../../src/domain/entities/DiagramElement';

const makeElement = (label: string, type: DiagramElement['type'] = 'microservice'): DiagramElement =>
  new DiagramElement({
    id: `el-${label}`,
    label,
    type,
    confidence: 0.9,
    boundingBox: { x: 10, y: 10, width: 100, height: 50 },
  });

const makeConnection = (from: string, to: string, type: ElementConnection['type'] = 'sync'): ElementConnection => ({
  fromElementId: from,
  toElementId: to,
  type,
  label: `${from} -> ${to}`,
});

describe('ExtractionResult entity', () => {
  describe('creation', () => {
    it('should create ExtractionResult with valid data', () => {
      const elements = [makeElement('api-gateway'), makeElement('user-service')];
      const connections = [makeConnection('el-api-gateway', 'el-user-service')];

      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: 'api-gateway user-service mongodb',
        elements,
        connections,
      });

      expect(result.diagramId).toBe('diagram-001');
      expect(result.extractedText).toBe('api-gateway user-service mongodb');
      expect(result.elements).toHaveLength(2);
      expect(result.connections).toHaveLength(1);
    });

    it('should start with status "processed" when elements are found', () => {
      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: 'some text',
        elements: [makeElement('api-gateway')],
        connections: [],
      });

      expect(result.status).toBe('processed');
    });

    it('should have status "failed" when error is present', () => {
      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: '',
        elements: [],
        connections: [],
        error: { code: 'TIMEOUT', message: 'Claude API timed out' },
      });

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('TIMEOUT');
      expect(result.error?.message).toBe('Claude API timed out');
    });

    it('should store multiple elements', () => {
      const elements = [
        makeElement('api-gateway', 'microservice'),
        makeElement('user-service', 'microservice'),
        makeElement('order-service', 'microservice'),
        makeElement('mongodb', 'database'),
        makeElement('kafka', 'broker'),
      ];

      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: 'api-gateway user-service order-service mongodb kafka',
        elements,
        connections: [],
      });

      expect(result.elements).toHaveLength(5);
    });

    it('should store connections between elements', () => {
      const elements = [makeElement('api-gateway'), makeElement('user-service'), makeElement('mongodb', 'database')];
      const connections = [
        makeConnection('el-api-gateway', 'el-user-service', 'sync'),
        makeConnection('el-user-service', 'el-mongodb', 'sync'),
      ];

      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: '',
        elements,
        connections,
      });

      expect(result.connections).toHaveLength(2);
      expect(result.connections[0].type).toBe('sync');
      expect(result.connections[1].fromElementId).toBe('el-user-service');
    });

    it('should allow empty connections array', () => {
      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: 'standalone-service',
        elements: [makeElement('standalone-service')],
        connections: [],
      });

      expect(result.connections).toHaveLength(0);
      expect(result.status).toBe('processed');
    });

    it('should allow empty elements array (diagrams with no detectable components)', () => {
      const result = new ExtractionResult({
        diagramId: 'diagram-001',
        extractedText: 'some text but no components detected',
        elements: [],
        connections: [],
      });

      expect(result.elements).toHaveLength(0);
      expect(result.status).toBe('processed');
    });
  });
});
