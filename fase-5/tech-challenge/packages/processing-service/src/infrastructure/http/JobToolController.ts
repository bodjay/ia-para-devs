import { Request, Response } from 'express';
import { IProcessingJobRepository } from '../../domain/repositories/IProcessingJobRepository';
import { ProcessingJob, DiagramElement, DiagramConnection, ProcessingError } from '../../domain/entities/ProcessingJob';

export class JobToolController {
  constructor(private readonly repository: IProcessingJobRepository) {}

  async create(req: Request, res: Response): Promise<void> {
    const { diagramId } = req.body as { diagramId?: string };
    if (!diagramId) {
      res.status(400).json({ error: 'diagramId is required' });
      return;
    }

    try {
      const job = new ProcessingJob({ diagramId });
      job.start();
      await this.repository.save(job);
      res.status(201).json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const body = req.body as {
      status: string;
      extractedText?: string;
      elements?: DiagramElement[];
      connections?: DiagramConnection[];
      error?: ProcessingError;
    };

    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        res.status(404).json({ error: `Job ${id} not found` });
        return;
      }

      if (body.status === 'processed') {
        existing.complete(body.extractedText ?? '', body.elements ?? [], body.connections ?? []);
      } else if (body.status === 'failed') {
        existing.fail(body.error ?? { code: 'UNKNOWN', message: 'Unknown error' });
      }

      await this.repository.update(existing);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
