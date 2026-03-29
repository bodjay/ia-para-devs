import mongoose, { Schema, Document } from 'mongoose';
import { Diagram } from '../../domain/entities/Diagram';
import { IDiagramRepository } from '../../domain/repositories/IDiagramRepository';

interface DiagramDocument extends Document {
  diagramId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt: Date;
  userId: string;
}

const DiagramSchema = new Schema<DiagramDocument>({
  diagramId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  storageUrl: { type: String, required: true },
  uploadedAt: { type: Date, required: true },
  userId: { type: String, required: true },
});

const DiagramModel = mongoose.model<DiagramDocument>('Diagram', DiagramSchema);

export class DiagramRepository implements IDiagramRepository {
  async save(diagram: Diagram): Promise<Diagram> {
    const doc = new DiagramModel({
      diagramId: diagram.id,
      fileName: diagram.fileName,
      fileType: diagram.fileType,
      fileSize: diagram.fileSize,
      storageUrl: diagram.storageUrl,
      uploadedAt: diagram.uploadedAt,
      userId: diagram.userId,
    });
    await doc.save();
    return diagram;
  }

  async findById(id: string): Promise<Diagram | null> {
    const doc = await DiagramModel.findOne({ diagramId: id });
    if (!doc) return null;
    return new Diagram({
      id: doc.diagramId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      storageUrl: doc.storageUrl,
      uploadedAt: doc.uploadedAt,
      userId: doc.userId,
    });
  }
}
