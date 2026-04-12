import mongoose, { Schema, Document } from 'mongoose';
import { Analysis, AnalysisProps } from '../../domain/entities/Analysis';
import { Diagram } from '../../domain/entities/Diagram';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';

interface AnalysisDocument extends Document {
  analysisId: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageUrl: string;
  };
  result?: object;
  error?: { code: string; message: string };
}

const AnalysisSchema = new Schema<AnalysisDocument>({
  analysisId: { type: String, required: true, unique: true },
  status: { type: String, required: true },
  createdAt: { type: Date, required: true },
  completedAt: { type: Date },
  diagram: {
    id: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
    storageUrl: String,
  },
  result: { type: Schema.Types.Mixed },
  error: { code: String, message: String },
});

const AnalysisModel = mongoose.model<AnalysisDocument>('Analysis', AnalysisSchema);

export class AnalysisRepository implements IAnalysisRepository {
  async save(analysis: Analysis): Promise<void> {
    const doc = new AnalysisModel(analysis.toJSON());
    await doc.save();
  }

  async findById(id: string): Promise<Analysis | null> {
    const doc = await AnalysisModel.findOne({ analysisId: id });
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByDiagramId(diagramId: string): Promise<Analysis | null> {
    const doc = await AnalysisModel.findOne({ 'diagram.id': diagramId }).sort({ createdAt: -1 });
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async update(analysis: Analysis): Promise<void> {
    const json = analysis.toJSON();
    await AnalysisModel.updateOne(
      { analysisId: json.analysisId },
      {
        $set: {
          status: json.status,
          completedAt: json.completedAt,
          result: json.result ? (json.result as any).toJSON?.() ?? json.result : undefined,
          error: json.error,
        },
      }
    );
  }

  private toEntity(doc: AnalysisDocument): Analysis {
    const props: AnalysisProps = {
      analysisId: doc.analysisId,
      status: doc.status as AnalysisProps['status'],
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
      diagram: new Diagram({
        id: doc.diagram.id,
        fileName: doc.diagram.fileName,
        fileType: doc.diagram.fileType as any,
        fileSize: doc.diagram.fileSize,
        storageUrl: doc.diagram.storageUrl,
      }),
      result: doc.result as AnalysisProps['result'],
      error: doc.error,
    };
    return new Analysis(props);
  }
}
