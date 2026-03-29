import mongoose, { Schema, Document } from 'mongoose';
import { ProcessingJob } from '../../domain/entities/ProcessingJob';
import { IProcessingJobRepository } from '../../domain/repositories/IProcessingJobRepository';

interface ProcessingJobDocument extends Document {
  jobId: string;
  diagramId: string;
  status: string;
  extractedText: string;
  elements: Array<{ type: string; label: string; position: { x: number; y: number } }>;
  error?: { code: string; message: string };
  createdAt: Date;
}

const ProcessingJobSchema = new Schema<ProcessingJobDocument>({
  jobId: { type: String, required: true, unique: true },
  diagramId: { type: String, required: true, index: true },
  status: { type: String, required: true },
  extractedText: { type: String, default: '' },
  elements: [
    {
      type: { type: String },
      label: String,
      position: { x: Number, y: Number },
    },
  ],
  error: { code: String, message: String },
  createdAt: { type: Date, required: true },
});

const ProcessingJobModel = mongoose.model<ProcessingJobDocument>('ProcessingJob', ProcessingJobSchema);

export class ProcessingJobRepository implements IProcessingJobRepository {
  async save(job: ProcessingJob): Promise<ProcessingJob> {
    const doc = new ProcessingJobModel({
      jobId: job.id,
      diagramId: job.diagramId,
      status: job.status,
      extractedText: job.extractedText,
      elements: job.elements,
      error: job.error,
      createdAt: job.createdAt,
    });
    await doc.save();
    return job;
  }

  async findById(id: string): Promise<ProcessingJob | null> {
    const doc = await ProcessingJobModel.findOne({ jobId: id });
    return doc ? this.toEntity(doc) : null;
  }

  async findByDiagramId(diagramId: string): Promise<ProcessingJob | null> {
    const doc = await ProcessingJobModel.findOne({ diagramId });
    return doc ? this.toEntity(doc) : null;
  }

  async update(job: ProcessingJob): Promise<ProcessingJob> {
    await ProcessingJobModel.updateOne(
      { jobId: job.id },
      {
        status: job.status,
        extractedText: job.extractedText,
        elements: job.elements,
        error: job.error,
      }
    );
    return job;
  }

  private toEntity(doc: ProcessingJobDocument): ProcessingJob {
    return new ProcessingJob({
      id: doc.jobId,
      diagramId: doc.diagramId,
      status: doc.status as ProcessingJob['status'],
      extractedText: doc.extractedText,
      elements: doc.elements as any,
      error: doc.error,
      createdAt: doc.createdAt,
    });
  }
}
