import { NextFunction, Request, Response } from 'express';
import { NotFoundException } from '../../application/use-cases/GetAnalysisUseCase';
import { ICreateAnalysisUseCase } from '../../domain/use-cases/ICreateAnalysisUseCase';
import { IGetAnalysisUseCase } from '../../domain/use-cases/IGetAnalysisUseCase';

export class AnalysisController {
  constructor(
    private readonly createAnalysisUseCase: ICreateAnalysisUseCase,
    private readonly getAnalysisUseCase: IGetAnalysisUseCase
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { diagram, user, options } = req.body;

      if (!diagram || !user) {
        res.status(422).json({
          error: 'UnprocessableEntity',
          message: 'Fields "diagram" and "user" are required',
        });
        return;
      }

      const result = await this.createAnalysisUseCase.execute({
        diagram,
        user,
        options,
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error) {
        if (
          err.message.includes('required') ||
          err.message.includes('Unsupported fileType') ||
          err.message.includes('invalid')
        ) {
          res.status(400).json({
            error: 'BadRequest',
            message: err.message,
          });
          return;
        }
      }
      next(err);
    }
  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || id.trim() === '') {
        res.status(400).json({
          error: 'BadRequest',
          message: 'Analysis id is required',
        });
        return;
      }

      const result = await this.getAnalysisUseCase.execute(id);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof NotFoundException) {
        res.status(404).json({
          error: 'NotFound',
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
}
