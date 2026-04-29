import express from 'express';
import { IReportRepository } from './domain/repositories/IReportRepository';
import { ReportToolController } from './infrastructure/http/ReportToolController';

export function createServer(repository: IReportRepository): express.Application {
  const app = express();
  app.use(express.json());

  const reportController = new ReportToolController(repository);

  app.post('/tools/reports', (req, res) => void reportController.store(req, res));

  return app;
}
