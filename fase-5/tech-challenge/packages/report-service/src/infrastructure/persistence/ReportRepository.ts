import mongoose, { Schema, Document } from 'mongoose';
import { Report } from '../../domain/entities/Report';
import { IReportRepository } from '../../domain/repositories/IReportRepository';

interface ReportDocument extends Document {
  reportId: string;
  analysisId: string;
  diagramId: string;
  status: string;
  components: object[];
  risks: object[];
  recommendations: object[];
  summary: string;
  patterns: object[];
  createdAt: Date;
  completedAt?: Date;
  error?: { code: string; message: string };
}

const ReportSchema = new Schema<ReportDocument>({
  reportId: { type: String, required: true, unique: true },
  analysisId: { type: String, index: true },
  diagramId: { type: String, required: true, index: true },
  status: { type: String, required: true },
  components: [Schema.Types.Mixed],
  risks: [Schema.Types.Mixed],
  recommendations: [Schema.Types.Mixed],
  summary: { type: String, default: '' },
  patterns: [Schema.Types.Mixed],
  createdAt: { type: Date, required: true },
  completedAt: Date,
  error: { code: String, message: String },
});

const ReportModel = mongoose.model<ReportDocument>('Report', ReportSchema);

export class ReportRepository implements IReportRepository {
  async save(report: Report): Promise<void> {
    const doc = new ReportModel({
      reportId: report.id,
      analysisId: report.analysisId,
      diagramId: report.diagramId,
      status: report.status,
      components: report.components,
      risks: report.risks,
      recommendations: report.recommendations,
      summary: report.summary,
      patterns: report.patterns,
      createdAt: report.createdAt,
      completedAt: report.completedAt,
      error: report.error,
    });
    await doc.save();
  }

  async findById(id: string): Promise<Report | null> {
    const doc = await ReportModel.findOne({ reportId: id });
    return doc ? this.toEntity(doc) : null;
  }

  async findByDiagramId(diagramId: string): Promise<Report | null> {
    const doc = await ReportModel.findOne({ diagramId });
    return doc ? this.toEntity(doc) : null;
  }

  async findByAnalysisId(analysisId: string): Promise<Report | null> {
    const doc = await ReportModel.findOne({ analysisId });
    return doc ? this.toEntity(doc) : null;
  }

  async update(report: Report): Promise<void> {
    await ReportModel.updateOne(
      { reportId: report.id },
      {
        analysisId: report.analysisId,
        status: report.status,
        components: report.components,
        risks: report.risks,
        recommendations: report.recommendations,
        summary: report.summary,
        patterns: report.patterns,
        completedAt: report.completedAt,
        error: report.error,
      }
    );
  }

  private toEntity(doc: ReportDocument): Report {
    return new Report({
      id: doc.reportId,
      analysisId: doc.analysisId,
      diagramId: doc.diagramId,
      status: doc.status as Report['status'],
      components: doc.components as any,
      risks: doc.risks as any,
      recommendations: doc.recommendations as any,
      summary: doc.summary,
      patterns: doc.patterns as any,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
      error: doc.error,
    });
  }
}
