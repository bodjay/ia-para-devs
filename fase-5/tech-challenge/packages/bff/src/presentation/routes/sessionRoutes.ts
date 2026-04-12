import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';

export function createSessionRouter(controller: SessionController): Router {
  const router = Router();

  router.get('/sessions', (req, res, next) => controller.listAll(req, res, next));
  router.post('/sessions', (req, res, next) => controller.create(req, res, next));
  router.get('/sessions/:id/messages', (req, res, next) => controller.getMessages(req, res, next));
  router.post('/sessions/:id/messages', (req, res, next) =>
    controller.createMessage(req, res, next)
  );

  return router;
}
