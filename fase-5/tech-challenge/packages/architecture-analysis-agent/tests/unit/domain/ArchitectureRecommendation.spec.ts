import { ArchitectureRecommendation, PriorityLevel } from '../../../src/domain/entities/ArchitectureRecommendation';

const makeRecommendation = (
  overrides: Partial<ConstructorParameters<typeof ArchitectureRecommendation>[0]> = {}
): ArchitectureRecommendation =>
  new ArchitectureRecommendation({
    title: 'Add Load Balancer for api-gateway',
    description: 'Deploy multiple api-gateway instances behind a load balancer to eliminate SPOF.',
    priority: 'high',
    relatedRisks: ['Single Point of Failure'],
    ...overrides,
  });

describe('ArchitectureRecommendation entity', () => {
  describe('creation', () => {
    it('should create recommendation with title, description and priority', () => {
      const rec = makeRecommendation();

      expect(rec.title).toBe('Add Load Balancer for api-gateway');
      expect(rec.description).toContain('load balancer');
      expect(rec.priority).toBe('high');
    });

    it('should accept priority "low"', () => {
      const rec = makeRecommendation({ priority: 'low' });

      expect(rec.priority).toBe('low');
    });

    it('should accept priority "medium"', () => {
      const rec = makeRecommendation({ priority: 'medium' });

      expect(rec.priority).toBe('medium');
    });

    it('should accept priority "high"', () => {
      const rec = makeRecommendation({ priority: 'high' });

      expect(rec.priority).toBe('high');
    });

    it('should throw when priority is invalid', () => {
      expect(() => makeRecommendation({ priority: 'urgent' as PriorityLevel })).toThrow('Invalid priority');
      expect(() => makeRecommendation({ priority: 'critical' as PriorityLevel })).toThrow('Invalid priority');
    });

    it('should store related risks list', () => {
      const rec = makeRecommendation({
        relatedRisks: ['Single Point of Failure', 'High Coupling', 'Lack of Redundancy'],
      });

      expect(rec.relatedRisks).toHaveLength(3);
      expect(rec.relatedRisks).toContain('Single Point of Failure');
      expect(rec.relatedRisks).toContain('High Coupling');
    });

    it('should throw when title is empty', () => {
      expect(() => makeRecommendation({ title: '' })).toThrow('title cannot be empty');
      expect(() => makeRecommendation({ title: '   ' })).toThrow('title cannot be empty');
    });
  });
});
