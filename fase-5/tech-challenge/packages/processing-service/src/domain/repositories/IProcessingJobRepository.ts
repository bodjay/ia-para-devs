import { ProcessingJob } from '../entities/ProcessingJob';

export interface IProcessingJobRepository {
  save(job: ProcessingJob): Promise<ProcessingJob>;
  findById(id: string): Promise<ProcessingJob | null>;
  findByDiagramId(diagramId: string): Promise<ProcessingJob | null>;
  update(job: ProcessingJob): Promise<ProcessingJob>;
}
