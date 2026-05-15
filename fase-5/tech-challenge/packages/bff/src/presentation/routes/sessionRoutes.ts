import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';
import { UploadTokenController } from '../controllers/UploadTokenController';

export function createSessionRouter(
  controller: SessionController,
  uploadTokenController: UploadTokenController
): Router {
  const router = Router();

  router.get('/sessions', (req, res, next) => controller.listAll(req, res, next));
  router.post('/sessions', (req, res, next) => controller.create(req, res, next));
  router.patch('/sessions/:id', (req, res, next) => controller.rename(req, res, next));
  router.get('/sessions/:id/export', (req, res, next) => controller.exportSession(req, res, next));
  router.get('/sessions/:id/messages', (req, res, next) => controller.getMessages(req, res, next));
  router.post('/sessions/:id/messages', (req, res, next) =>
    controller.createMessage(req, res, next)
  );
  router.post('/sessions/:id/upload-token', (req, res, next) =>
    uploadTokenController.generate(req, res, next)
  );

  return router;
}
