import { Request, Response, NextFunction } from 'express';
import { IUploadDiagramUseCase } from '../../domain/use-cases/IUploadDiagramUseCase';
import { ValidationError } from '../../application/use-cases/UploadDiagramUseCase';
import { StorageError } from '../../infrastructure/storage/IStorageAdapter';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../../domain/entities/Diagram';
import { UploadTokenValidator } from '../../infrastructure/redis/UploadTokenValidator';

export class UploadController {
  constructor(
    private readonly uploadUseCase: IUploadDiagramUseCase,
    private readonly tokenValidator?: UploadTokenValidator
  ) {}

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate Redis upload token when validator is configured
      let sessionId: string | undefined;
      if (this.tokenValidator) {
        const token = req.headers['x-upload-token'] as string | undefined;
        if (!token) {
          res.status(401).json({ error: 'Missing X-Upload-Token header' });
          return;
        }
        const payload = await this.tokenValidator.validateAndConsume(token);
        if (!payload) {
          res.status(401).json({ error: 'Invalid or expired upload token' });
          return;
        }
        sessionId = payload.sessionId;
      }

      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      if (!SUPPORTED_FILE_TYPES.includes(file.mimetype as any)) {
        res.status(415).json({
          error: `Unsupported media type: ${file.mimetype}. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`,
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        res.status(413).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES} bytes`,
        });
        return;
      }

      const user = req.body.user;
      if (typeof user === 'string') {
        try {
          req.body.user = JSON.parse(user);
        } catch {
          res.status(422).json({ error: 'Invalid user data' });
          return;
        }
      }

      const result = await this.uploadUseCase.execute({
        file: {
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          buffer: file.buffer,
        },
        user: req.body.user,
        sessionId,
      });

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        if (
          error.message.includes('user.id') ||
          error.message.includes('user.email') ||
          error.message.includes('user.name')
        ) {
          res.status(422).json({ error: error.message });
          return;
        }
        if (error.message.includes('file type')) {
          res.status(415).json({ error: error.message });
          return;
        }
        if (error.message.includes('size')) {
          res.status(413).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof StorageError) {
        res.status(500).json({ error: 'Storage service unavailable' });
        return;
      }

      next(error);
    }
  }
}
