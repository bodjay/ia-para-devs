import { ReportChunk } from '../entities/ReportChunk';
import { VectorizationInput } from '../../application/ports/IVectorizationEvent';

export class ReportChunker {
  chunk(input: VectorizationInput): ReportChunk[] {
    const chunks: ReportChunk[] = [];
    const base = {
      diagramId: input.diagramId,
      analysisId: input.analysisId,
      createdAt: new Date().toISOString(),
    };

    chunks.push({
      id: `${input.diagramId}__summary__0`,
      text: `Architecture summary: ${input.summary}`,
      metadata: { ...base, chunkType: 'summary' },
    });

    input.components.forEach((c, i) => {
      const obs = c.observations ? `. ${c.observations}` : '';
      chunks.push({
        id: `${input.diagramId}__component__${i}`,
        text: `Component "${c.name}" (${c.type}): ${c.description}${obs}`,
        metadata: { ...base, chunkType: 'component', itemTitle: c.name },
      });
    });

    input.risks.forEach((r, i) => {
      const affected = r.affectedComponents.join(', ');
      chunks.push({
        id: `${input.diagramId}__risk__${i}`,
        text: `Risk [${r.severity}] "${r.title}": ${r.description}. Affects: ${affected}.`,
        metadata: { ...base, chunkType: 'risk', itemTitle: r.title, severity: r.severity },
      });
    });

    input.recommendations.forEach((rec, i) => {
      chunks.push({
        id: `${input.diagramId}__recommendation__${i}`,
        text: `Recommendation [${rec.priority}] "${rec.title}": ${rec.description}`,
        metadata: { ...base, chunkType: 'recommendation', itemTitle: rec.title, priority: rec.priority },
      });
    });

    return chunks;
  }
}
