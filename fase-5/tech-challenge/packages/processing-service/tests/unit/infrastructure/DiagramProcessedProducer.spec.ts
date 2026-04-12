import { Kafka, Producer } from 'kafkajs';
import {
  DiagramProcessedProducer,
  KafkaProducerError,
  DiagramProcessedEventPayload,
} from '../../../src/infrastructure/kafka/DiagramProcessedProducer';

const makeMockProducer = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue([{ topicName: 'diagram.processed', partition: 0, errorCode: 0 }]),
});

const makeMockKafka = (mockProducer: ReturnType<typeof makeMockProducer>) => {
  return {
    producer: jest.fn().mockReturnValue(mockProducer),
  } as unknown as Kafka;
};

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
      { type: 'microservice', label: 'API Gateway', position: { x: 0, y: 0 } },
      { type: 'database', label: 'User DB', position: { x: 200, y: 100 } },
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
  processing: {
    status: 'failed',
  },
  error: {
    code: 'EXTRACTION_FAILED',
    message: 'Could not extract diagram elements',
  },
});

describe('DiagramProcessedProducer', () => {
  let mockProducer: ReturnType<typeof makeMockProducer>;
  let kafka: Kafka;
  let producer: DiagramProcessedProducer;

  beforeEach(() => {
    mockProducer = makeMockProducer();
    kafka = makeMockKafka(mockProducer);
    producer = new DiagramProcessedProducer(kafka);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should publish to "diagram.processed" topic', () => {
    it('sends message to diagram.processed topic', async () => {
      await producer.connect();
      await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'diagram.processed' })
      );
    });
  });

  describe('should serialize payload as JSON', () => {
    it('message value is a valid JSON string', async () => {
      await producer.connect();
      await producer.publishDiagramProcessed(makeSuccessPayload());

      const sentMessages = mockProducer.send.mock.calls[0][0].messages;
      expect(sentMessages).toHaveLength(1);
      expect(() => JSON.parse(sentMessages[0].value as string)).not.toThrow();
    });

    it('serialized JSON contains all payload data', async () => {
      await producer.connect();
      const payload = makeSuccessPayload();

      await producer.publishDiagramProcessed(payload);

      const parsedEvent = JSON.parse(mockProducer.send.mock.calls[0][0].messages[0].value as string);
      expect(parsedEvent.diagram.id).toBe(payload.diagram.id);
      expect(parsedEvent.processing.extractedText).toBe(payload.processing.extractedText);
    });
  });

  describe('should include all required fields (eventId, timestamp, diagram, processing)', () => {
    it('published event has eventId, timestamp, diagram, and processing fields', async () => {
      await producer.connect();

      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(event).toHaveProperty('eventId');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('diagram');
      expect(event).toHaveProperty('processing');

      const parsedEvent = JSON.parse(mockProducer.send.mock.calls[0][0].messages[0].value as string);
      expect(parsedEvent).toHaveProperty('eventId');
      expect(parsedEvent).toHaveProperty('timestamp');
      expect(parsedEvent).toHaveProperty('diagram');
      expect(parsedEvent).toHaveProperty('processing');
    });

    it('eventId is a non-empty UUID-like string', async () => {
      await producer.connect();

      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
    });

    it('timestamp is in ISO-8601 format', async () => {
      await producer.connect();

      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('should set processing.status to "processed" on success', () => {
    it('returns event with processing.status "processed"', async () => {
      await producer.connect();

      const event = await producer.publishDiagramProcessed(makeSuccessPayload());

      expect(event.processing.status).toBe('processed');
    });

    it('serialized message processing.status is "processed"', async () => {
      await producer.connect();
      await producer.publishDiagramProcessed(makeSuccessPayload());

      const parsedEvent = JSON.parse(mockProducer.send.mock.calls[0][0].messages[0].value as string);
      expect(parsedEvent.processing.status).toBe('processed');
    });
  });

  describe('should set processing.status to "failed" on failure', () => {
    it('returns event with processing.status "failed"', async () => {
      await producer.connect();

      const event = await producer.publishDiagramProcessed(makeFailedPayload());

      expect(event.processing.status).toBe('failed');
    });

    it('includes error details when status is failed', async () => {
      await producer.connect();

      const event = await producer.publishDiagramProcessed(makeFailedPayload());

      expect(event.error).toBeDefined();
      expect(event.error?.code).toBe('EXTRACTION_FAILED');
      expect(event.error?.message).toBe('Could not extract diagram elements');
    });

    it('serialized message includes error field for failed events', async () => {
      await producer.connect();
      await producer.publishDiagramProcessed(makeFailedPayload());

      const parsedEvent = JSON.parse(mockProducer.send.mock.calls[0][0].messages[0].value as string);
      expect(parsedEvent.processing.status).toBe('failed');
      expect(parsedEvent.error).toBeDefined();
    });
  });

  describe('should throw when Kafka is unavailable', () => {
    it('throws KafkaProducerError when producer.send fails', async () => {
      mockProducer.send.mockRejectedValue(new Error('Kafka broker connection refused'));
      await producer.connect();

      await expect(
        producer.publishDiagramProcessed(makeSuccessPayload())
      ).rejects.toThrow(KafkaProducerError);
    });

    it('KafkaProducerError message contains original error info', async () => {
      mockProducer.send.mockRejectedValue(new Error('Connection refused at 127.0.0.1:9092'));
      await producer.connect();

      await expect(
        producer.publishDiagramProcessed(makeSuccessPayload())
      ).rejects.toThrow(/Connection refused/);
    });

    it('does not silently swallow the error', async () => {
      mockProducer.send.mockRejectedValue(new Error('network failure'));
      await producer.connect();

      let thrownError: Error | null = null;
      try {
        await producer.publishDiagramProcessed(makeSuccessPayload());
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError).toBeInstanceOf(KafkaProducerError);
    });
  });
});
