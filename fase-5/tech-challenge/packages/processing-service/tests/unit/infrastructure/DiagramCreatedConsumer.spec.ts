import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { DiagramCreatedConsumer } from '../../../src/infrastructure/kafka/DiagramCreatedConsumer';
import { IProcessDiagramUseCase, DiagramCreatedEvent } from '../../../src/domain/use-cases/IProcessDiagramUseCase';

const makeValidEvent = (): DiagramCreatedEvent => ({
  eventId: 'event-111',
  timestamp: '2024-01-15T10:00:00.000Z',
  diagram: {
    id: 'diagram-xyz-789',
    fileName: 'system-arch.png',
    fileType: 'image/png',
    fileSize: 256000,
    storageUrl: 'https://storage.example.com/diagrams/system-arch.png',
  },
  user: {
    id: 'user-001',
    name: 'Maria Santos',
    email: 'maria@example.com',
  },
});

const makeMockConsumer = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  run: jest.fn().mockResolvedValue(undefined),
  commitOffsets: jest.fn().mockResolvedValue(undefined),
});

const makeMockKafka = (mockConsumer: ReturnType<typeof makeMockConsumer>) => {
  return {
    consumer: jest.fn().mockReturnValue(mockConsumer),
  } as unknown as Kafka;
};

const makeMockUseCase = (): jest.Mocked<IProcessDiagramUseCase> => ({
  execute: jest.fn().mockResolvedValue(undefined),
});

describe('DiagramCreatedConsumer', () => {
  let mockConsumer: ReturnType<typeof makeMockConsumer>;
  let kafka: Kafka;
  let mockUseCase: jest.Mocked<IProcessDiagramUseCase>;
  let consumer: DiagramCreatedConsumer;

  // Helper to get and invoke the eachMessage handler registered via consumer.run
  const captureAndRunEachMessage = async (payload: Partial<EachMessagePayload>) => {
    const runConfig = mockConsumer.run.mock.calls[0][0];
    await runConfig.eachMessage(payload);
  };

  const makeMessagePayload = (
    value: string | null,
    overrides: Record<string, unknown> = {}
  ) => ({
    topic: 'diagram.created',
    partition: 0,
    message: {
      key: Buffer.from('diagram-xyz-789'),
      value: value !== null ? Buffer.from(value) : null,
      offset: '0',
      attributes: 0,
      timestamp: Date.now().toString(),
      size: 100,
    },
    heartbeat: jest.fn().mockResolvedValue(undefined),
    commitOffsetsIfNecessary: jest.fn().mockResolvedValue(undefined),
    resolveOffset: jest.fn(),
    isRunning: jest.fn().mockReturnValue(true),
    isStale: jest.fn().mockReturnValue(false),
    pause: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    mockConsumer = makeMockConsumer();
    kafka = makeMockKafka(mockConsumer);
    mockUseCase = makeMockUseCase();
    consumer = new DiagramCreatedConsumer(kafka, mockUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should subscribe to "diagram.created" topic', () => {
    it('subscribes to diagram.created when subscribe() is called', async () => {
      await consumer.connect();
      await consumer.subscribe();

      expect(mockConsumer.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'diagram.created' })
      );
    });
  });

  describe('should call ProcessDiagramUseCase when message is received', () => {
    it('invokes useCase.execute with parsed event', async () => {
      const event = makeValidEvent();
      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      const payload = makeMessagePayload(JSON.stringify(event));
      await captureAndRunEachMessage(payload);

      expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: event.eventId })
      );
    });
  });

  describe('should parse JSON message payload correctly', () => {
    it('deserializes the Kafka message value from JSON', async () => {
      const event = makeValidEvent();
      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      await captureAndRunEachMessage(makeMessagePayload(JSON.stringify(event)));

      const executedEvent: DiagramCreatedEvent = mockUseCase.execute.mock.calls[0][0];
      expect(executedEvent.diagram.id).toBe(event.diagram.id);
      expect(executedEvent.diagram.fileName).toBe(event.diagram.fileName);
      expect(executedEvent.user.email).toBe(event.user.email);
    });
  });

  describe('should handle deserialization error gracefully', () => {
    it('does not throw when message value is invalid JSON', async () => {
      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      await expect(
        captureAndRunEachMessage(makeMessagePayload('not-valid-json{'))
      ).resolves.not.toThrow();

      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('does not throw when message value is null', async () => {
      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      await expect(
        captureAndRunEachMessage(makeMessagePayload(null))
      ).resolves.not.toThrow();

      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('should commit offset after successful processing', () => {
    it('calls commitOffsetsIfNecessary after successful useCase.execute', async () => {
      const event = makeValidEvent();
      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      const payload = makeMessagePayload(JSON.stringify(event));
      await captureAndRunEachMessage(payload);

      expect(payload.commitOffsetsIfNecessary).toHaveBeenCalledTimes(1);
    });
  });

  describe('should not commit offset when processing fails', () => {
    it('does not call commitOffsetsIfNecessary when useCase.execute throws', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Processing failed unexpectedly'));

      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      const payload = makeMessagePayload(JSON.stringify(makeValidEvent()));
      await captureAndRunEachMessage(payload);

      expect(payload.commitOffsetsIfNecessary).not.toHaveBeenCalled();
    });
  });

  describe('should log error when message processing fails', () => {
    it('does not throw when useCase.execute rejects', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Unexpected processing error'));

      await consumer.connect();
      await consumer.subscribe();
      await consumer.start();

      await expect(
        captureAndRunEachMessage(makeMessagePayload(JSON.stringify(makeValidEvent())))
      ).resolves.not.toThrow();
    });
  });
});
