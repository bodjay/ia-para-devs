import express from 'express';
import request from 'supertest';
import { NotFoundException } from '../../../src/application/use-cases/GetAnalysisUseCase';
import { AnalysisController } from '../../../src/presentation/controllers/AnalysisController';
import { createAnalysisRouter } from '../../../src/presentation/routes/analysisRoutes';
import { ICreateAnalysisUseCase, CreateAnalysisOutput } from '../../../src/domain/use-cases/ICreateAnalysisUseCase';
import { IGetAnalysisUseCase, GetAnalysisOutput } from '../../../src/domain/use-cases/IGetAnalysisUseCase';
import { NextFunction, Request, Response } from 'express';

const makeCreateUseCase = (): jest.Mocked<ICreateAnalysisUseCase> => ({
  execute: jest.fn(),
});

const makeGetUseCase = (): jest.Mocked<IGetAnalysisUseCase> => ({
  execute: jest.fn(),
});

const buildApp = (
  createUseCase: ICreateAnalysisUseCase,
  getUseCase: IGetAnalysisUseCase
): express.Application => {
  const controller = new AnalysisController(createUseCase, getUseCase);
  const app = express();
  app.use(express.json());
  app.use('/', createAnalysisRouter(controller));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'InternalServerError', message: err.message });
  });

  return app;
};

const validCreateBody = {
  diagram: {
    id: 'diag-001',
    fileName: 'architecture.png',
    fileType: 'image/png',
    fileSize: 204800,
    storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
  },
  user: {
    id: 'user-001',
    name: 'João Silva',
    email: 'joao.silva@example.com',
  },
  options: {
    language: 'pt-BR',
    analysisDepth: 'basic',
    includeRecommendations: true,
    includeRisks: true,
  },
};

const createSuccessResponse: CreateAnalysisOutput = {
  analysisId: 'analysis-uuid-001',
  status: 'created',
  createdAt: '2026-01-15T10:00:00.000Z',
  estimatedCompletionSeconds: 30,
};

const completedAnalysisResponse: GetAnalysisOutput = {
  analysisId: 'analysis-uuid-001',
  status: 'completed',
  createdAt: '2026-01-15T10:00:00.000Z',
  completedAt: '2026-01-15T10:01:00.000Z',
  diagram: {
    id: 'diag-001',
    fileName: 'architecture.png',
    fileType: 'image/png',
    storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
  },
  result: {
    components: [
      { name: 'API Gateway', type: 'microservice', description: 'Entry point' },
      { name: 'MongoDB', type: 'database', description: 'Data store' },
    ],
    risks: [
      { title: 'SPOF', description: 'Single point of failure', severity: 'high' },
    ],
    recommendations: [
      { title: 'Add load balancer', description: 'Use load balancer', priority: 'high' },
    ],
    summary: 'Architecture looks sound with some improvements needed.',
  },
};

describe('AnalysisController', () => {
  describe('POST /analysis/create', () => {
    it('should return 201 with analysisId on valid request', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      createUseCase.execute.mockResolvedValue(createSuccessResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app)
        .post('/analysis/create')
        .send(validCreateBody)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.analysisId).toBe('analysis-uuid-001');
      expect(response.body.status).toBe('created');
      expect(response.body.estimatedCompletionSeconds).toBe(30);
    });

    it('should return 400 when body is invalid (use case throws)', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      createUseCase.execute.mockRejectedValue(new Error('user.email is invalid'));

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app)
        .post('/analysis/create')
        .send({ ...validCreateBody, user: { ...validCreateBody.user, email: 'bad-email' } })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('BadRequest');
      expect(response.body.message).toContain('invalid');
    });

    it('should return 400 when fileType is unsupported', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      createUseCase.execute.mockRejectedValue(
        new Error('Unsupported fileType: image/bmp. Supported types: image/png, image/jpeg, application/pdf')
      );

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app)
        .post('/analysis/create')
        .send({
          ...validCreateBody,
          diagram: { ...validCreateBody.diagram, fileType: 'image/bmp' },
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('BadRequest');
      expect(response.body.message).toContain('Unsupported fileType');
    });

    it('should return 422 when required fields are missing (no diagram)', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app)
        .post('/analysis/create')
        .send({ user: validCreateBody.user })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('UnprocessableEntity');
    });

    it('should return 422 when required fields are missing (no user)', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app)
        .post('/analysis/create')
        .send({ diagram: validCreateBody.diagram })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('UnprocessableEntity');
    });

    it('should return 400 when diagram id is missing', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      createUseCase.execute.mockRejectedValue(new Error('diagram.id is required'));

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app)
        .post('/analysis/create')
        .send({
          ...validCreateBody,
          diagram: { ...validCreateBody.diagram, id: '' },
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /analysis/:id', () => {
    it('should return 200 with full analysis when found', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockResolvedValue(completedAnalysisResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-uuid-001');

      expect(response.status).toBe(200);
      expect(response.body.analysisId).toBe('analysis-uuid-001');
      expect(response.body.status).toBe('completed');
    });

    it('should return 404 when analysis is not found', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockRejectedValue(
        new NotFoundException('Analysis with id "unknown-id" not found')
      );

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/unknown-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
      expect(response.body.message).toContain('not found');
    });

    it('should return analysis with correct structure', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockResolvedValue(completedAnalysisResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-uuid-001');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        analysisId: expect.any(String),
        status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
        createdAt: expect.any(String),
        diagram: {
          id: expect.any(String),
          fileName: expect.any(String),
          fileType: expect.any(String),
          storageUrl: expect.any(String),
        },
        result: {
          components: expect.any(Array),
          risks: expect.any(Array),
          recommendations: expect.any(Array),
          summary: expect.any(String),
        },
      });
    });

    it('should return analysis with components having correct shape', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockResolvedValue(completedAnalysisResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-uuid-001');

      const components = response.body.result.components;
      expect(components.length).toBeGreaterThan(0);
      components.forEach((component: Record<string, unknown>) => {
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('type');
        expect(component).toHaveProperty('description');
        expect(['microservice', 'database', 'broker', 'client', 'unknown']).toContain(
          component.type
        );
      });
    });

    it('should return analysis with risks having severity field', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockResolvedValue(completedAnalysisResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-uuid-001');

      const risks = response.body.result.risks;
      expect(risks.length).toBeGreaterThan(0);
      risks.forEach((risk: Record<string, unknown>) => {
        expect(risk).toHaveProperty('severity');
        expect(['low', 'medium', 'high']).toContain(risk.severity);
      });
    });

    it('should return analysis with recommendations having priority field', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockResolvedValue(completedAnalysisResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-uuid-001');

      const recommendations = response.body.result.recommendations;
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach((rec: Record<string, unknown>) => {
        expect(rec).toHaveProperty('priority');
        expect(['low', 'medium', 'high']).toContain(rec.priority);
      });
    });

    it('should call getAnalysisUseCase with the correct id from route params', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      getUseCase.execute.mockResolvedValue(completedAnalysisResponse);

      const app = buildApp(createUseCase, getUseCase);
      await request(app).get('/analysis/analysis-uuid-001');

      expect(getUseCase.execute).toHaveBeenCalledWith('analysis-uuid-001');
    });

    it('should return 200 for pending analysis without result field', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      const pendingResponse: GetAnalysisOutput = {
        analysisId: 'analysis-pending-001',
        status: 'pending',
        createdAt: '2026-01-15T10:00:00.000Z',
        diagram: {
          id: 'diag-001',
          fileName: 'architecture.png',
          fileType: 'image/png',
          storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
        },
      };
      getUseCase.execute.mockResolvedValue(pendingResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-pending-001');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('pending');
      expect(response.body.result).toBeUndefined();
    });

    it('should return 200 for failed analysis with error details', async () => {
      const createUseCase = makeCreateUseCase();
      const getUseCase = makeGetUseCase();
      const failedResponse: GetAnalysisOutput = {
        analysisId: 'analysis-failed-001',
        status: 'failed',
        createdAt: '2026-01-15T09:00:00.000Z',
        completedAt: '2026-01-15T09:00:30.000Z',
        diagram: {
          id: 'diag-001',
          fileName: 'architecture.png',
          fileType: 'image/png',
          storageUrl: 'https://storage.example.com/diagrams/diag-001.png',
        },
        error: {
          code: 'EXTRACTION_ERROR',
          message: 'Failed to extract diagram components',
        },
      };
      getUseCase.execute.mockResolvedValue(failedResponse);

      const app = buildApp(createUseCase, getUseCase);
      const response = await request(app).get('/analysis/analysis-failed-001');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('failed');
      expect(response.body.error.code).toBe('EXTRACTION_ERROR');
    });
  });
});
