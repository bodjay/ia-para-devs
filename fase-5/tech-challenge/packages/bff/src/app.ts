import express, { NextFunction, Request, Response } from 'express';
import { AnalysisController } from './presentation/controllers/AnalysisController';
import { createAnalysisRouter } from './presentation/routes/analysisRoutes';

export function createApp(controller: AnalysisController): express.Application {
  const app = express();
  app.use(express.json());

  const router = createAnalysisRouter(controller);
  app.use('/', router);

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    });
  });

  return app;
}
