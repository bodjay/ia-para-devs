import {
  DiagramProcessedProducer,
  StreamProducerError,
  DiagramProcessedEventPayload,
} from '../../../src/infrastructure/redis/DiagramProcessedProducer';
import { getRedisClient } from '../../../src/infrastructure/redis/RedisClient';

jest.mock('../../../src/infrastructure/redis/RedisClient');

const makeMockRedis = () => ({
  xadd: jest.fn().mockResolvedValue('1704067200000-0'),
});

const makeSuccessPayload = (overrides: Partial<DiagramProcessedEventPayload> = {}): DiagramProcessedEventPayload => ({
  diagram: {
    id: 'diagram-processed-456',
    fileName: 'microservices-arch.png',
    fileType: 'image/png',
    storageUrl: 'https://storage.example.com/diagrams/microservices-arch.png',
  },
  processing: {
    status: 'processed',
    extractedText: 'API Gateway -> Auth Service -> User DB',
    elements: [
      { id: 'e1', type: 'microservice', label: 'API Gateway', position: { x: 0, y: 0 } },
      { id: 'e2', type: 'database', label: 'User DB', position: { x: 200, y: 100 } },
    ],
  },
  ...overrides,
});

const makeFailedPayload = (): DiagramProcessedEventPayload => ({
  diagram: {
    id: 'diagram-failed-789',
    fileName: 'corrupted.pdf',
    fileType: 'application/pdf',
    storageUrl: 'https://storage.example.com/diagrams/corrupted.pdf',
  },
  processing: { status: 'failed' },
  error: { code: 'EXTRACTION_FAILED', message: 'Could not extract diagram elements' },
});

describe('DiagramProcessedProducer', () => {
  let mockRedis: ReturnType<typeof makeMockRedis>;
  let producer: DiagramProcessedProducer;

  beforeEach(() => {
    mockRedis = makeMockRedis();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    producer = new DiagramProcessedProducer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should publish to streams:diagram:processed stream', () => {
    it('calls xadd on the correct stream key', async () => {
      await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        'streams:diagram:processed',
        expect.any(String), // MAXLEN
        expect.any(String), // ~
        expect.any(String), // 10000
        '*',
        'data',
        expect.any(String),
      );
    });
  });

  describe('should serialize payload as JSON', () => {
    it('message data is valid JSON containing all payload fields', async () => {
      const payload = makeSuccessPayload();

      await producer.publishDiagramProcessed(payload);

      const rawData = (mockRedis.xadd.mock.calls[0] as string[]).at(-1) as string;
      const parsedEvent = JSON.parse(rawData);

      expect(parsedEvent.diagram.id).toBe(payload.diagram.id);
      expect(parsedEvent.processing.extractedText).toBe(payload.processing.extractedText);
    });
  });

  describe('should include all required fields (eventId, timestamp, diagram, processing)', () => {
    it('returned event has eventId, timestamp, diagram, and processing', async () => {
      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(event).toHaveProperty('eventId');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('diagram');
      expect(event).toHaveProperty('processing');
    });

    it('timestamp is in ISO-8601 format', async () => {
      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('should set processing.status correctly', () => {
    it('returns event with processing.status "processed" for success', async () => {
      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(event.processing.status).toBe('processed');
    });

    it('returns event with processing.status "failed" and error field', async () => {
      const event = await producer.publishDiagramProcessed(makeFailedPayload());

      expect(event.processing.status).toBe('failed');
      expect(event.error?.code).toBe('EXTRACTION_FAILED');
    });
  });

  describe('should throw when Redis is unavailable', () => {
    it('throws StreamProducerError when xadd fails', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Redis broker connection refused'));

      await expect(
        producer.publishDiagramProcessed(makeSuccessPayload())
      ).rejects.toThrow(StreamProducerError);
    });

    it('StreamProducerError message contains original error info', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Connection refused'));

      await expect(
        producer.publishDiagramProcessed(makeSuccessPayload())
      ).rejects.toThrow(/Connection refused/);
    });
  });
});
