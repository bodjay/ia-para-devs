import express from 'express';
import { IVectorRepository } from './domain/repositories/IVectorRepository';
import { SearchReportsUseCase } from './application/use-cases/SearchReportsUseCase';
import { SearchController } from './infrastructure/http/SearchController';

export function createServer(repository: IVectorRepository): express.Application {
  const app = express();
  app.use(express.json());

  const searchUseCase = new SearchReportsUseCase(repository);
  const searchController = new SearchController(searchUseCase);

  app.get('/tools/search', (req, res) => void searchController.search(req, res));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
