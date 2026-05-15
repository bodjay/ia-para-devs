import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../../src/app';
import { IUploadDiagramUseCase, UploadDiagramInput, UploadDiagramOutput } from '../../../src/domain/use-cases/IUploadDiagramUseCase';
import { ValidationError } from '../../../src/application/use-cases/UploadDiagramUseCase';
import { StorageError } from '../../../src/infrastructure/storage/IStorageAdapter';
import { StreamProducerError } from '../../../src/infrastructure/redis/DiagramEventProducer';

const makeMockUseCase = (overrides: Partial<jest.Mocked<IUploadDiagramUseCase>> = {}): jest.Mocked<IUploadDiagramUseCase> => {
  const defaultOutput: UploadDiagramOutput = {
    diagramId: 'diagram-test-123',
    status: 'uploaded',
    storageUrl: 'https://storage.example.com/diagrams/architecture.png',
    uploadedAt: '2024-01-15T10:30:00.000Z',
  };
  return {
    execute: jest.fn().mockResolvedValue(defaultOutput),
    ...overrides,
  };
};

const makeFormData = (app: Application, fileOptions: { buffer: Buffer; filename: string; mimetype: string }) => {
  return request(app)
    .post('/upload')
    .attach('file', fileOptions.buffer, { filename: fileOptions.filename, contentType: fileOptions.mimetype })
    .field('user', JSON.stringify({ id: 'user-123', name: 'João Silva', email: 'joao@example.com' }));
};

describe('UploadController', () => {
  let app: Application;
  let mockUseCase: jest.Mocked<IUploadDiagramUseCase>;

  const validPngBuffer = Buffer.from('PNG-fake-data');
  const validPdfBuffer = Buffer.from('%PDF-fake-data');

  beforeEach(() => {
    mockUseCase = makeMockUseCase();
    app = createApp(mockUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /upload returns 201 with diagramId and storageUrl on valid PNG upload', () => {
    it('responds 201 and includes diagramId and storageUrl for PNG', async () => {
      const response = await makeFormData(app, {
        buffer: validPngBuffer,
        filename: 'architecture.png',
        mimetype: 'image/png',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('diagramId');
      expect(response.body).toHaveProperty('storageUrl');
      expect(response.body.diagramId).toBe('diagram-test-123');
      expect(response.body.storageUrl).toMatch(/^https?:\/\//);
    });
  });

  describe('POST /upload returns 201 on valid PDF upload', () => {
    it('responds 201 for application/pdf', async () => {
      const response = await makeFormData(app, {
        buffer: validPdfBuffer,
        filename: 'architecture.pdf',
        mimetype: 'application/pdf',
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('uploaded');
    });
  });

  describe('POST /upload returns 400 when no file is sent', () => {
    it('responds 400 when file field is missing', async () => {
      const response = await request(app)
        .post('/upload')
        .field('user', JSON.stringify({ id: 'user-123', name: 'João', email: 'joao@example.com' }));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /upload returns 415 when file type is not supported', () => {
    it('responds 415 for text/plain MIME type', async () => {
      const response = await makeFormData(app, {
        buffer: Buffer.from('plain text content'),
        filename: 'architecture.txt',
        mimetype: 'text/plain',
      });

      expect(response.status).toBe(415);
      expect(response.body).toHaveProperty('error');
    });

    it('responds 415 for application/zip MIME type', async () => {
      const response = await makeFormData(app, {
        buffer: Buffer.from('PK fake zip data'),
        filename: 'files.zip',
        mimetype: 'application/zip',
      });

      expect(response.status).toBe(415);
    });
  });

  describe('POST /upload returns 413 when file exceeds size limit', () => {
    it('responds 413 when use case throws ValidationError with size message', async () => {
      mockUseCase.execute.mockRejectedValue(
        new ValidationError('File size 11534336 exceeds maximum allowed size of 10485760 bytes')
      );

      const response = await makeFormData(app, {
        buffer: validPngBuffer,
        filename: 'huge.png',
        mimetype: 'image/png',
      });

      expect(response.status).toBe(413);
    });
  });

  describe('POST /upload returns 422 when user.id is missing', () => {
    it('responds 422 when use case throws ValidationError for user.id', async () => {
      mockUseCase.execute.mockRejectedValue(
        new ValidationError('user.id is required')
      );

      const response = await makeFormData(app, {
        buffer: validPngBuffer,
        filename: 'arch.png',
        mimetype: 'image/png',
      });

      expect(response.status).toBe(422);
      expect(response.body.error).toContain('user.id');
    });
  });

  describe('POST /upload returns 422 when user.email is invalid', () => {
    it('responds 422 when use case throws ValidationError for user.email', async () => {
      mockUseCase.execute.mockRejectedValue(
        new ValidationError('user.email must be a valid email')
      );

      const response = await makeFormData(app, {
        buffer: validPngBuffer,
        filename: 'arch.png',
        mimetype: 'image/png',
      });

      expect(response.status).toBe(422);
      expect(response.body.error).toContain('user.email');
    });
  });

  describe('POST /upload returns 500 when storage fails', () => {
    it('responds 500 when use case throws StorageError', async () => {
      mockUseCase.execute.mockRejectedValue(
        new StorageError('S3 bucket unavailable')
      );

      const response = await makeFormData(app, {
        buffer: validPngBuffer,
        filename: 'arch.png',
        mimetype: 'image/png',
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /upload response includes uploadedAt as ISO-8601', () => {
    it('uploadedAt field matches ISO-8601 format', async () => {
      const response = await makeFormData(app, {
        buffer: validPngBuffer,
        filename: 'arch.png',
        mimetype: 'image/png',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('uploadedAt');
      expect(response.body.uploadedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });
});
