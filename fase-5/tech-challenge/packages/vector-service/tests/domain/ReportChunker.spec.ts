import { ReportChunker } from '../../src/domain/services/ReportChunker';
import { VectorizationInput } from '../../src/application/ports/IVectorizationEvent';

const baseInput: VectorizationInput = {
  diagramId: 'diag-123',
  analysisId: 'analysis-456',
  summary: 'A microservice architecture with API gateway.',
  components: [
    { name: 'API Gateway', type: 'microservice', description: 'Handles routing' },
    { name: 'Auth Service', type: 'microservice', description: 'Handles auth', observations: 'Uses JWT' },
  ],
  risks: [
    {
      title: 'Single point of failure',
      description: 'API Gateway is not HA',
      severity: 'high',
      affectedComponents: ['API Gateway'],
    },
  ],
  recommendations: [
    {
      title: 'Add load balancer',
      description: 'Deploy multiple gateway instances',
      priority: 'high',
      relatedRisks: ['Single point of failure'],
    },
  ],
};

describe('ReportChunker', () => {
  const chunker = new ReportChunker();

  it('generates one summary chunk', () => {
    const chunks = chunker.chunk(baseInput);
    const summary = chunks.filter((c) => c.metadata.chunkType === 'summary');
    expect(summary).toHaveLength(1);
    expect(summary[0].id).toBe('diag-123__summary__0');
    expect(summary[0].text).toContain('Architecture summary:');
    expect(summary[0].text).toContain(baseInput.summary);
  });

  it('generates one chunk per component', () => {
    const chunks = chunker.chunk(baseInput);
    const components = chunks.filter((c) => c.metadata.chunkType === 'component');
    expect(components).toHaveLength(2);
    expect(components[0].id).toBe('diag-123__component__0');
    expect(components[0].text).toContain('API Gateway');
    expect(components[1].text).toContain('Uses JWT');
  });

  it('generates one chunk per risk with severity', () => {
    const chunks = chunker.chunk(baseInput);
    const risks = chunks.filter((c) => c.metadata.chunkType === 'risk');
    expect(risks).toHaveLength(1);
    expect(risks[0].id).toBe('diag-123__risk__0');
    expect(risks[0].text).toContain('[high]');
    expect(risks[0].text).toContain('API Gateway');
    expect(risks[0].metadata.severity).toBe('high');
  });

  it('generates one chunk per recommendation with priority', () => {
    const chunks = chunker.chunk(baseInput);
    const recs = chunks.filter((c) => c.metadata.chunkType === 'recommendation');
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe('diag-123__recommendation__0');
    expect(recs[0].text).toContain('[high]');
    expect(recs[0].metadata.priority).toBe('high');
  });

  it('uses diagramId as chunk id prefix for idempotency', () => {
    const chunks = chunker.chunk(baseInput);
    chunks.forEach((c) => {
      expect(c.id.startsWith('diag-123__')).toBe(true);
    });
  });

  it('all chunks carry diagramId and analysisId in metadata', () => {
    const chunks = chunker.chunk(baseInput);
    chunks.forEach((c) => {
      expect(c.metadata.diagramId).toBe('diag-123');
      expect(c.metadata.analysisId).toBe('analysis-456');
    });
  });

  it('returns 0 component/risk/recommendation chunks for empty arrays', () => {
    const empty: VectorizationInput = { ...baseInput, components: [], risks: [], recommendations: [] };
    const chunks = chunker.chunk(empty);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.chunkType).toBe('summary');
  });
});
