import { Request, Response, NextFunction } from 'express';
import { GenerateUploadTokenUseCase } from '../../application/use-cases/GenerateUploadTokenUseCase';

export class UploadTokenController {
  constructor(private readonly generateToken: GenerateUploadTokenUseCase) {}

  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const token = await this.generateToken.execute(id);
      res.status(201).json(token);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Session not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}
