import express from 'express';
import { ITextractAdapter } from './infrastructure/textract/TextractAdapter';
import { IProcessingJobRepository } from './domain/repositories/IProcessingJobRepository';
import { OcrToolController } from './infrastructure/http/OcrToolController';
import { JobToolController } from './infrastructure/http/JobToolController';

export function createServer(
  textractAdapter: ITextractAdapter,
  repository: IProcessingJobRepository
): express.Application {
  const app = express();
  app.use(express.json());

  const ocrController = new OcrToolController(textractAdapter);
  const jobController = new JobToolController(repository);

  app.post('/tools/ocr', (req, res) => void ocrController.handle(req, res));
  app.post('/tools/jobs', (req, res) => void jobController.create(req, res));
  app.put('/tools/jobs/:id', (req, res) => void jobController.update(req, res));

  return app;
}
