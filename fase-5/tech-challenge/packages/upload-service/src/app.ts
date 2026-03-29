import express, { Application } from 'express';
import multer from 'multer';
import { UploadController } from './presentation/controllers/UploadController';
import { IUploadDiagramUseCase } from './domain/use-cases/IUploadDiagramUseCase';
import { MAX_FILE_SIZE_BYTES } from './domain/entities/Diagram';

export function createApp(uploadUseCase: IUploadDiagramUseCase): Application {
  const app = express();
  app.use(express.json());

  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES + 1 },
  });

  const controller = new UploadController(uploadUseCase);

  app.post('/upload', upload.single('file'), (req, res, next) =>
    controller.upload(req, res, next)
  );

  // Generic error handler
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
