import { Request, Response } from 'express';
import { IReportRepository } from '../../domain/repositories/IReportRepository';
import { Report } from '../../domain/entities/Report';
import { AnalysisCompletedEvent } from '../../application/ports/IAnalysisCompletedProducer';

export class ReportToolController {
  constructor(private readonly repository: IReportRepository) {}

  async store(req: Request, res: Response): Promise<void> {
    const event = req.body as AnalysisCompletedEvent;

    if (!event?.diagramId) {
      res.status(400).json({ error: 'diagramId is required' });
      return;
    }

    try {
      const existing = await this.repository.findByDiagramId(event.diagramId);

      if (existing && existing.status === 'completed') {
        res.json({ reportId: existing.id });
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

      res.status(201).json({ reportId: report.id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
