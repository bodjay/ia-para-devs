import express, { NextFunction, Request, Response } from 'express';
import { AnalysisController } from './presentation/controllers/AnalysisController';
import { SessionController } from './presentation/controllers/SessionController';
import { UploadTokenController } from './presentation/controllers/UploadTokenController';
import { createAnalysisRouter } from './presentation/routes/analysisRoutes';
import { createSessionRouter } from './presentation/routes/sessionRoutes';
import { createDiagramRouter } from './presentation/routes/diagramRoutes';
import { ICreateAnalysisUseCase } from './domain/use-cases/ICreateAnalysisUseCase';
import { ISessionRepository } from './domain/repositories/ISessionRepository';
import { IAnalysisRepository } from './domain/repositories/IAnalysisRepository';
import { IUploadTokenStore } from './domain/services/IUploadTokenStore';

export function createApp(
  analysisController: AnalysisController,
  sessionController: SessionController,
  uploadTokenController: UploadTokenController,
  createAnalysisUseCase: ICreateAnalysisUseCase,
  sessionRepository: ISessionRepository,
  analysisRepository: IAnalysisRepository,
  uploadTokenStore: IUploadTokenStore
): express.Application {
  const app = express();
  app.use(express.json());

  app.use('/', createAnalysisRouter(analysisController));
  app.use('/', createSessionRouter(sessionController, uploadTokenController));
  app.use('/', createDiagramRouter(createAnalysisUseCase, sessionRepository, analysisRepository, uploadTokenStore));

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
