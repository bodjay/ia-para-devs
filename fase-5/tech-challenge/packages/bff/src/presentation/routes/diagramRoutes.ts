import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import axios from 'axios';
import { ICreateAnalysisUseCase } from '../../domain/use-cases/ICreateAnalysisUseCase';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import { IUploadTokenStore } from '../../domain/services/IUploadTokenStore';
import { DiagramFileType, SUPPORTED_FILE_TYPES } from '../../domain/entities/Diagram';

const UPLOAD_SERVICE_URL =
  process.env.UPLOAD_SERVICE_URL ?? 'http://upload-service:3002';

const SYSTEM_USER = {
  id: 'system',
  name: 'System',
  email: 'system@arch-analyzer.local',
};

const upload = multer({ storage: multer.memoryStorage() });

export function createDiagramRouter(
  createAnalysisUseCase: ICreateAnalysisUseCase,
  sessionRepository: ISessionRepository,
  analysisRepository: IAnalysisRepository,
  uploadTokenStore: IUploadTokenStore
): Router {
  const router = Router();

  router.post(
    '/diagrams/upload',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const file = req.file;
        const sessionId: string | undefined = req.body?.sessionId;

        if (!file) {
          res.status(400).json({ error: 'No file provided' });
          return;
        }

        if (!SUPPORTED_FILE_TYPES.includes(file.mimetype as DiagramFileType)) {
          res.status(415).json({
            error: `Unsupported file type: ${file.mimetype}`,
          });
          return;
        }

        // Generate a single-use token for the internal BFF → upload-service call
        const { token } = await uploadTokenStore.generateToken(sessionId ?? 'system');

        // Forward multipart to upload-service using native FormData (Node 18+)
        const form = new FormData();
        const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
        form.append('file', blob, file.originalname);
        form.append('user', JSON.stringify(SYSTEM_USER));

        const uploadRes = await axios.post<{
          diagramId: string;
          storageUrl: string;
          uploadedAt: string;
        }>(`${UPLOAD_SERVICE_URL}/upload`, form, {
          headers: { 'x-upload-token': token },
        });

        const { diagramId, storageUrl } = uploadRes.data;

        // Create analysis record in BFF
        const analysisOutput = await createAnalysisUseCase.execute({
          diagram: {
            id: diagramId,
            fileName: file.originalname,
            fileType: file.mimetype as DiagramFileType,
            fileSize: file.size,
            storageUrl,
          },
          user: SYSTEM_USER,
        });

        // Link diagram + analysis to session if provided
        if (sessionId) {
          const session = await sessionRepository.findById(sessionId);
          if (session) {
            session.linkDiagram(diagramId, analysisOutput.analysisId);
            await sessionRepository.update(session);
          }
        }

        res.status(201).json({
          diagramId,
          analysisId: analysisOutput.analysisId,
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status ?? 502;
          const body = err.response?.data ?? { error: 'Upload service unavailable' };
          res.status(status).json(body);
          return;
        }
        next(err);
      }
    }
  );

  router.get(
    '/diagrams/:diagramId/image',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { diagramId } = req.params;
        const analysis = await analysisRepository.findByDiagramId(diagramId);
        if (!analysis) {
          res.status(404).json({ error: 'Diagram not found' });
          return;
        }

        const imgRes = await axios.get<NodeJS.ReadableStream>(analysis.diagram.storageUrl, {
          responseType: 'stream',
        });

        res.setHeader('Content-Type', (imgRes.headers['content-type'] as string) || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        (imgRes.data as NodeJS.ReadableStream).pipe(res);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          res.status(404).json({ error: 'Image not found in storage' });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
