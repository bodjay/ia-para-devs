import { ArchitectureRisk, SeverityLevel } from '../../../src/domain/entities/ArchitectureRisk';

const makeRisk = (overrides: Partial<ConstructorParameters<typeof ArchitectureRisk>[0]> = {}): ArchitectureRisk =>
  new ArchitectureRisk({
    title: 'Single Point of Failure',
    description: 'The api-gateway has no replica, making it a SPOF.',
    severity: 'high',
    affectedComponents: ['api-gateway'],
    ...overrides,
  });

describe('ArchitectureRisk entity', () => {
  describe('creation', () => {
    it('should create risk with title, description and severity', () => {
      const risk = makeRisk();

      expect(risk.title).toBe('Single Point of Failure');
      expect(risk.description).toContain('api-gateway');
      expect(risk.severity).toBe('high');
    });

    it('should accept severity "low"', () => {
      const risk = makeRisk({ severity: 'low' });

      expect(risk.severity).toBe('low');
    });

    it('should accept severity "medium"', () => {
      const risk = makeRisk({ severity: 'medium' });

      expect(risk.severity).toBe('medium');
    });

    it('should accept severity "high"', () => {
      const risk = makeRisk({ severity: 'high' });

      expect(risk.severity).toBe('high');
    });

    it('should throw when severity is invalid', () => {
      expect(() => makeRisk({ severity: 'critical' as SeverityLevel })).toThrow('Invalid severity');
      expect(() => makeRisk({ severity: 'extreme' as SeverityLevel })).toThrow('Invalid severity');
    });

    it('should store affected components list', () => {
      const risk = makeRisk({
        affectedComponents: ['api-gateway', 'user-service', 'order-service'],
      });

      expect(risk.affectedComponents).toHaveLength(3);
      expect(risk.affectedComponents).toContain('api-gateway');
      expect(risk.affectedComponents).toContain('user-service');
      expect(risk.affectedComponents).toContain('order-service');
    });

    it('should throw when title is empty', () => {
      expect(() => makeRisk({ title: '' })).toThrow('title cannot be empty');
      expect(() => makeRisk({ title: '   ' })).toThrow('title cannot be empty');
    });

    it('should allow empty affectedComponents', () => {
      const risk = makeRisk({ affectedComponents: [] });

      expect(risk.affectedComponents).toHaveLength(0);
    });
  });
});
