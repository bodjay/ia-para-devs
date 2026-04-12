import { Router } from 'express';
import { AnalysisController } from '../controllers/AnalysisController';

export function createAnalysisRouter(controller: AnalysisController): Router {
  const router = Router();

  router.post('/analysis/create', (req, res, next) =>
    controller.create(req, res, next)
  );

  router.get('/analysis/:id', (req, res, next) =>
    controller.getById(req, res, next)
  );

  return router;
}
