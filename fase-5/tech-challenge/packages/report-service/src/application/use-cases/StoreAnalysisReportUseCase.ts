import { Report } from '../../domain/entities/Report';
import { IReportRepository } from '../../domain/repositories/IReportRepository';
import { AnalysisCompletedEvent } from '../ports/IAnalysisCompletedProducer';

export class StoreAnalysisReportUseCase {
  constructor(private readonly repository: IReportRepository) {}

  async execute(event: AnalysisCompletedEvent): Promise<void> {
    const existing = await this.repository.findByDiagramId(event.diagramId);
    if (existing && existing.status === 'completed') {
      console.warn(
        `[StoreAnalysisReportUseCase] Report for diagram ${event.diagramId} already completed, skipping`
      );
      return;
    }

    const report = existing ?? new Report({ diagramId: event.diagramId });

    if (event.status === 'completed' && event.result) {
      report.complete({
        analysisId: event.analysisId,
        components: event.result.components,
        risks: event.result.risks,
        recommendations: event.result.recommendations,
        summary: event.result.summary,
        patterns: [],
      });
    } else {
      report.fail(event.error ?? { code: 'ANALYSIS_FAILED', message: 'Analysis failed' });
    }

    if (existing) {
      await this.repository.update(report);
    } else {
      await this.repository.save(report);
    }
  }
}
