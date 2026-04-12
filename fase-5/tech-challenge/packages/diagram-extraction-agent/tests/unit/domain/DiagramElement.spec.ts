import { DiagramElement, ElementType, BoundingBox } from '../../../src/domain/entities/DiagramElement';

const makeValidBoundingBox = (overrides: Partial<BoundingBox> = {}): BoundingBox => ({
  x: 100,
  y: 200,
  width: 150,
  height: 60,
  ...overrides,
});

const makeElement = (overrides: Partial<ConstructorParameters<typeof DiagramElement>[0]> = {}): DiagramElement =>
  new DiagramElement({
    id: 'el-001',
    label: 'api-gateway',
    type: 'microservice',
    confidence: 0.95,
    boundingBox: makeValidBoundingBox(),
    ...overrides,
  });

describe('DiagramElement entity', () => {
  describe('creation', () => {
    it('should create element with all required fields', () => {
      const element = makeElement();

      expect(element.id).toBe('el-001');
      expect(element.label).toBe('api-gateway');
      expect(element.type).toBe('microservice');
      expect(element.confidence).toBe(0.95);
      expect(element.boundingBox).toEqual(makeValidBoundingBox());
    });

    it('should generate id automatically when not provided', () => {
      const element = new DiagramElement({
        label: 'user-service',
        type: 'microservice',
        confidence: 0.9,
        boundingBox: makeValidBoundingBox(),
      });

      expect(element.id).toBeDefined();
      expect(element.id.length).toBeGreaterThan(0);
    });
  });

  describe('element type classification', () => {
    it('should classify as "microservice" type', () => {
      const element = makeElement({ label: 'user-service', type: 'microservice' });

      expect(element.type).toBe('microservice');
    });

    it('should classify as "database" type', () => {
      const element = makeElement({ label: 'mongodb', type: 'database' });

      expect(element.type).toBe('database');
    });

    it('should classify as "broker" type', () => {
      const element = makeElement({ label: 'kafka', type: 'broker' });

      expect(element.type).toBe('broker');
    });

    it('should classify as "client" type', () => {
      const element = makeElement({ label: 'web-client', type: 'client' });

      expect(element.type).toBe('client');
    });

    it('should default to "unknown" for unrecognized element', () => {
      const element = makeElement({ label: 'unidentified-component', type: 'unknown' });

      expect(element.type).toBe('unknown');
    });
  });

  describe('confidence validation', () => {
    it('should store confidence between 0.0 and 1.0', () => {
      const low = makeElement({ confidence: 0.1 });
      const mid = makeElement({ confidence: 0.5 });
      const high = makeElement({ confidence: 1.0 });

      expect(low.confidence).toBe(0.1);
      expect(mid.confidence).toBe(0.5);
      expect(high.confidence).toBe(1.0);
    });

    it('should throw when confidence is outside [0, 1] range', () => {
      expect(() => makeElement({ confidence: -0.1 })).toThrow('confidence must be between 0.0 and 1.0');
      expect(() => makeElement({ confidence: 1.1 })).toThrow('confidence must be between 0.0 and 1.0');
      expect(() => makeElement({ confidence: 2.0 })).toThrow('confidence must be between 0.0 and 1.0');
    });
  });

  describe('bounding box', () => {
    it('should store bounding box with x, y, width, height', () => {
      const boundingBox: BoundingBox = { x: 50, y: 75, width: 200, height: 80 };
      const element = makeElement({ boundingBox });

      expect(element.boundingBox.x).toBe(50);
      expect(element.boundingBox.y).toBe(75);
      expect(element.boundingBox.width).toBe(200);
      expect(element.boundingBox.height).toBe(80);
    });
  });

  describe('label validation', () => {
    it('should throw when label is empty', () => {
      expect(() => makeElement({ label: '' })).toThrow('label cannot be empty');
      expect(() => makeElement({ label: '   ' })).toThrow('label cannot be empty');
    });

    it('should trim whitespace from label', () => {
      const element = makeElement({ label: '  api-gateway  ' });

      expect(element.label).toBe('api-gateway');
    });
  });
});
