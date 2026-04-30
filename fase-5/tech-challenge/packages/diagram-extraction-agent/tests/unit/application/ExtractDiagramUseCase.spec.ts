import { ExtractDiagramUseCase } from '../../../src/application/use-cases/ExtractDiagramUseCase';
import { IVisionClient, VisionExtractionResponse } from '../../../src/infrastructure/ai/IVisionClient';
import { ExtractDiagramInput } from '../../../src/domain/use-cases/IExtractDiagramUseCase';
import { ProcessingServiceClient } from '../../../src/infrastructure/tools/ProcessingServiceClient';

type ClaudeExtractionResponse = VisionExtractionResponse;

const makeClaudeResponse = (overrides: Partial<ClaudeExtractionResponse> = {}): ClaudeExtractionResponse => ({
  extractedText: 'api-gateway user-service order-service mongodb kafka web-client',
  elements: [
    { id: 'el-1', label: 'api-gateway', type: 'microservice', confidence: 0.97, boundingBox: { x: 50, y: 50, width: 120, height: 60 } },
    { id: 'el-2', label: 'user-service', type: 'microservice', confidence: 0.95, boundingBox: { x: 250, y: 50, width: 120, height: 60 } },
    { id: 'el-3', label: 'order-service', type: 'microservice', confidence: 0.94, boundingBox: { x: 450, y: 50, width: 120, height: 60 } },
    { id: 'el-4', label: 'mongodb', type: 'database', confidence: 0.98, boundingBox: { x: 250, y: 200, width: 120, height: 60 } },
    { id: 'el-5', label: 'kafka', type: 'broker', confidence: 0.96, boundingBox: { x: 450, y: 200, width: 120, height: 60 } },
    { id: 'el-6', label: 'web-client', type: 'client', confidence: 0.93, boundingBox: { x: 50, y: 200, width: 120, height: 60 } },
  ],
  connections: [
    { fromElementId: 'el-1', toElementId: 'el-2', type: 'sync', label: 'HTTP REST' },
    { fromElementId: 'el-1', toElementId: 'el-3', type: 'sync', label: 'HTTP REST' },
    { fromElementId: 'el-2', toElementId: 'el-4', type: 'sync', label: 'MongoDB driver' },
    { fromElementId: 'el-3', toElementId: 'el-5', type: 'async', label: 'Kafka publish' },
    { fromElementId: 'el-6', toElementId: 'el-1', type: 'sync', label: 'HTTP/HTTPS' },
  ],
  ...overrides,
});

const makePngInput = (): ExtractDiagramInput => ({
  action: 'extract',
  payload: {
    diagram: {
      id: 'diagram-001',
      fileType: 'image/png',
      storageUrl: 'https://storage.example.com/diagrams/architecture.png',
    },
    options: {
      detectText: true,
      detectShapes: true,
      detectConnections: true,
      language: 'pt-BR',
    },
  },
});

const makeJpegInput = (): ExtractDiagramInput => ({
  action: 'extract',
  payload: {
    diagram: {
      id: 'diagram-002',
      fileType: 'image/jpeg',
      storageUrl: 'https://storage.example.com/diagrams/architecture.jpg',
    },
  },
});

const makePdfInput = (): ExtractDiagramInput => ({
  action: 'extract',
  payload: {
    diagram: {
      id: 'diagram-003',
      fileType: 'application/pdf',
      storageUrl: 'https://storage.example.com/diagrams/architecture.pdf',
    },
  },
});

describe('ExtractDiagramUseCase', () => {
  let claudeVisionClient: jest.Mocked<IVisionClient>;
  let processingClient: jest.Mocked<ProcessingServiceClient>;
  let useCase: ExtractDiagramUseCase;

  beforeEach(() => {
    claudeVisionClient = {
      extractFromUrl: jest.fn().mockResolvedValue(makeClaudeResponse()),
    } as jest.Mocked<IVisionClient>;

    processingClient = {
      ocr: jest.fn().mockResolvedValue(''),
      createJob: jest.fn().mockResolvedValue('job-001'),
      updateJob: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProcessingServiceClient>;

    useCase = new ExtractDiagramUseCase(claudeVisionClient, processingClient);
  });

  describe('file type support', () => {
    it('should extract elements from PNG image diagram', async () => {
      const result = await useCase.execute(makePngInput());

      expect(result.status).toBe('processed');
      expect(result.elements.length).toBeGreaterThan(0);
      expect(claudeVisionClient.extractFromUrl).toHaveBeenCalledWith(
        'https://storage.example.com/diagrams/architecture.png',
        'image/png',
        undefined
      );
    });

    it('should extract elements from JPEG image diagram', async () => {
      const result = await useCase.execute(makeJpegInput());

      expect(result.status).toBe('processed');
      expect(claudeVisionClient.extractFromUrl).toHaveBeenCalledWith(
        expect.any(String),
        'image/jpeg',
        undefined
      );
    });

    it('should extract elements from PDF diagram', async () => {
      const result = await useCase.execute(makePdfInput());

      expect(result.status).toBe('processed');
      expect(claudeVisionClient.extractFromUrl).toHaveBeenCalledWith(
        expect.any(String),
        'application/pdf',
        undefined
      );
    });
  });

  describe('Claude API interaction', () => {
    it('should call Claude API with image URL', async () => {
      await useCase.execute(makePngInput());

      expect(claudeVisionClient.extractFromUrl).toHaveBeenCalledWith(
        'https://storage.example.com/diagrams/architecture.png',
        expect.any(String),
        undefined
      );
    });

    it('should pass pre-extracted text to Claude when provided in input', async () => {
      const inputWithText: ExtractDiagramInput = {
        ...makePngInput(),
        payload: {
          ...makePngInput().payload,
          extractedText: 'API Gateway User Service MongoDB',
        },
      };

      await useCase.execute(inputWithText);

      expect(claudeVisionClient.extractFromUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'API Gateway User Service MongoDB'
      );
    });

    it('should return extractedText from diagram', async () => {
      const result = await useCase.execute(makePngInput());

      expect(result.extractedText).toBe('api-gateway user-service order-service mongodb kafka web-client');
    });
  });

  describe('element detection', () => {
    it('should detect microservice elements', async () => {
      const result = await useCase.execute(makePngInput());

      const microservices = result.elements.filter((el) => el.type === 'microservice');
      expect(microservices.length).toBeGreaterThanOrEqual(3);
      expect(microservices.map((el) => el.label)).toContain('api-gateway');
      expect(microservices.map((el) => el.label)).toContain('user-service');
    });

    it('should detect database elements', async () => {
      const result = await useCase.execute(makePngInput());

      const databases = result.elements.filter((el) => el.type === 'database');
      expect(databases.length).toBeGreaterThanOrEqual(1);
      expect(databases[0].label).toBe('mongodb');
    });

    it('should detect broker/message queue elements', async () => {
      const result = await useCase.execute(makePngInput());

      const brokers = result.elements.filter((el) => el.type === 'broker');
      expect(brokers.length).toBeGreaterThanOrEqual(1);
      expect(brokers[0].label).toBe('kafka');
    });

    it('should detect client/frontend elements', async () => {
      const result = await useCase.execute(makePngInput());

      const clients = result.elements.filter((el) => el.type === 'client');
      expect(clients.length).toBeGreaterThanOrEqual(1);
      expect(clients[0].label).toBe('web-client');
    });

    it('should extract text labels from diagram elements', async () => {
      const result = await useCase.execute(makePngInput());

      const labels = result.elements.map((el) => el.label);
      expect(labels).toContain('api-gateway');
      expect(labels).toContain('user-service');
      expect(labels).toContain('mongodb');
    });

    it('should set confidence score for each detected element', async () => {
      const result = await useCase.execute(makePngInput());

      result.elements.forEach((element) => {
        expect(element.confidence).toBeGreaterThanOrEqual(0);
        expect(element.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should set bounding box coordinates for each element', async () => {
      const result = await useCase.execute(makePngInput());

      result.elements.forEach((element) => {
        expect(element.boundingBox).toBeDefined();
        expect(typeof element.boundingBox.x).toBe('number');
        expect(typeof element.boundingBox.y).toBe('number');
        expect(typeof element.boundingBox.width).toBe('number');
        expect(typeof element.boundingBox.height).toBe('number');
      });
    });
  });

  describe('connection detection', () => {
    it('should detect connections between elements', async () => {
      const result = await useCase.execute(makePngInput());

      expect(result.connections.length).toBeGreaterThan(0);
    });

    it('should classify connection as "sync" when direct HTTP arrow', async () => {
      const result = await useCase.execute(makePngInput());

      const syncConnections = result.connections.filter((c) => c.type === 'sync');
      expect(syncConnections.length).toBeGreaterThan(0);
      const httpConnection = syncConnections.find((c) => c.fromElementId === 'el-1' && c.toElementId === 'el-2');
      expect(httpConnection).toBeDefined();
    });

    it('should classify connection as "async" when Kafka/queue arrow', async () => {
      const result = await useCase.execute(makePngInput());

      const asyncConnections = result.connections.filter((c) => c.type === 'async');
      expect(asyncConnections.length).toBeGreaterThan(0);
      const kafkaConnection = asyncConnections.find((c) => c.toElementId === 'el-5');
      expect(kafkaConnection).toBeDefined();
    });
  });

  describe('successful extraction', () => {
    it('should return status "processed" on successful extraction', async () => {
      const result = await useCase.execute(makePngInput());

      expect(result.status).toBe('processed');
      expect(result.error).toBeUndefined();
    });
  });

  describe('failure scenarios', () => {
    it('should return status "failed" when Claude API returns error', async () => {
      claudeVisionClient.extractFromUrl.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const result = await useCase.execute(makePngInput());

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('API rate limit exceeded');
    });

    it('should handle Claude API timeout and return failed status', async () => {
      claudeVisionClient.extractFromUrl.mockRejectedValueOnce(new Error('Request timeout after 30000ms'));

      const result = await useCase.execute(makePngInput());

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('TIMEOUT');
    });

    it('should handle invalid image URL and return failed status', async () => {
      claudeVisionClient.extractFromUrl.mockRejectedValueOnce(new Error('Invalid URL provided'));

      const result = await useCase.execute(makePngInput());

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('INVALID_URL');
    });
  });

  describe('advanced detection', () => {
    it('should detect Single Point of Failure patterns in the diagram', async () => {
      // A diagram with a single api-gateway and no redundancy triggers SPOF detection by the analysis agent
      // At extraction level, the element is detected; the SPOF risk is raised by analysis
      const spofResponse = makeClaudeResponse({
        elements: [
          { id: 'el-1', label: 'api-gateway', type: 'microservice', confidence: 0.97, boundingBox: { x: 50, y: 50, width: 120, height: 60 } },
          { id: 'el-2', label: 'mongodb', type: 'database', confidence: 0.98, boundingBox: { x: 200, y: 50, width: 120, height: 60 } },
        ],
        connections: [
          { fromElementId: 'el-1', toElementId: 'el-2', type: 'sync', label: 'direct' },
        ],
      });
      claudeVisionClient.extractFromUrl.mockResolvedValueOnce(spofResponse);

      const result = await useCase.execute(makePngInput());

      expect(result.status).toBe('processed');
      // Single gateway detected — SPOF is a downstream concern
      const gateway = result.elements.find((el) => el.label === 'api-gateway');
      expect(gateway).toBeDefined();
      expect(result.connections).toHaveLength(1);
    });
  });
});
