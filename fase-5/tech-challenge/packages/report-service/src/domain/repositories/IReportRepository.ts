import { Report } from '../entities/Report';

export interface IReportRepository {
  save(report: Report): Promise<void>;
  findById(id: string): Promise<Report | null>;
  findByDiagramId(diagramId: string): Promise<Report | null>;
  findByAnalysisId(analysisId: string): Promise<Report | null>;
  update(report: Report): Promise<void>;
}
