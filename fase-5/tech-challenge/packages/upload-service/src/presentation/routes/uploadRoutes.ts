import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/UploadController';
import { MAX_FILE_SIZE_BYTES } from '../../domain/entities/Diagram';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES + 1 }, // allow slightly over to detect in controller
});

export function createUploadRouter(controller: UploadController): Router {
  const router = Router();

  router.post('/upload', upload.single('file'), (req, res, next) =>
    controller.upload(req, res, next)
  );

  return router;
}
