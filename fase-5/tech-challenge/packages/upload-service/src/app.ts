import express, { Application } from 'express';
import multer from 'multer';
import path from 'path';
import { UploadController } from './presentation/controllers/UploadController';
import { IUploadDiagramUseCase } from './domain/use-cases/IUploadDiagramUseCase';
import { MAX_FILE_SIZE_BYTES } from './domain/entities/Diagram';
import { UploadTokenValidator } from './infrastructure/redis/UploadTokenValidator';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';

export function createApp(
  uploadUseCase: IUploadDiagramUseCase,
  tokenValidator?: UploadTokenValidator
): Application {
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES + 1 },
  });

  const controller = new UploadController(uploadUseCase, tokenValidator);

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
