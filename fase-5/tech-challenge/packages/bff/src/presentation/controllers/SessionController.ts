import { NextFunction, Request, Response } from 'express';
import { IListSessionsUseCase } from '../../domain/use-cases/IListSessionsUseCase';
import { ICreateSessionUseCase } from '../../domain/use-cases/ICreateSessionUseCase';
import { IGetMessagesUseCase } from '../../domain/use-cases/IGetMessagesUseCase';
import { ICreateMessageUseCase } from '../../domain/use-cases/ICreateMessageUseCase';
import { IRenameSessionUseCase } from '../../domain/use-cases/IRenameSessionUseCase';
import { IExportSessionUseCase } from '../../domain/use-cases/IExportSessionUseCase';

export class SessionController {
  constructor(
    private readonly listSessionsUseCase: IListSessionsUseCase,
    private readonly createSessionUseCase: ICreateSessionUseCase,
    private readonly getMessagesUseCase: IGetMessagesUseCase,
    private readonly createMessageUseCase: ICreateMessageUseCase,
    private readonly renameSessionUseCase: IRenameSessionUseCase,
    private readonly exportSessionUseCase: IExportSessionUseCase
  ) {}

  async listAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await this.listSessionsUseCase.execute();
      // Map sessionId → id to match frontend SessionRecord shape
      const body = sessions.map((s) => ({
        id: s.sessionId,
        name: s.name,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        diagramId: s.diagramId,
        analysisId: s.analysisId,
      }));
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, id } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(422).json({
          error: 'UnprocessableEntity',
          message: 'Field "name" is required',
        });
        return;
      }

      const session = await this.createSessionUseCase.execute({ name, sessionId: id });
      res.status(201).json({
        id: session.sessionId,
        name: session.name,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const messages = await this.getMessagesUseCase.execute(id);
      res.status(200).json(messages);
    } catch (err) {
      next(err);
    }
  }

  async createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { content, attachments } = req.body;

      if (!content || typeof content !== 'string' || content.trim() === '') {
        res.status(422).json({
          error: 'UnprocessableEntity',
          message: 'Field "content" is required',
        });
        return;
      }

      const message = await this.createMessageUseCase.execute({
        sessionId: id,
        content,
        attachments,
      });

      res.status(201).json(message);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Session not found')) {
        res.status(404).json({ error: 'NotFound', message: err.message });
        return;
      }
      next(err);
    }
  }

  async rename(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(422).json({
          error: 'UnprocessableEntity',
          message: 'Field "name" is required',
        });
        return;
      }

      const result = await this.renameSessionUseCase.execute({ sessionId: id, name });
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Session not found')) {
        res.status(404).json({ error: 'NotFound', message: err.message });
        return;
      }
      next(err);
    }
  }

  async exportSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.exportSessionUseCase.execute(id);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Session not found')) {
        res.status(404).json({ error: 'NotFound', message: err.message });
        return;
      }
      next(err);
    }
  }
}
