import { Kafka, Producer } from 'kafkajs';
import { DiagramEventProducer, KafkaProducerError } from '../../../src/infrastructure/kafka/DiagramEventProducer';

const makeMockProducer = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue([{ topicName: 'diagram.created', partition: 0, errorCode: 0 }]),
});

const makeMockKafka = (mockProducer: ReturnType<typeof makeMockProducer>) => {
  const kafka = {
    producer: jest.fn().mockReturnValue(mockProducer),
  } as unknown as Kafka;
  return kafka;
};

const makeValidPayload = () => ({
  diagram: {
    id: 'diagram-abc-123',
    fileName: 'architecture.png',
    fileType: 'image/png',
    fileSize: 512000,
    storageUrl: 'https://storage.example.com/diagrams/architecture.png',
  },
  user: {
    id: 'user-xyz-456',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
  },
});

describe('DiagramEventProducer', () => {
  let mockProducer: ReturnType<typeof makeMockProducer>;
  let kafka: Kafka;
  let diagramEventProducer: DiagramEventProducer;

  beforeEach(() => {
    mockProducer = makeMockProducer();
    kafka = makeMockKafka(mockProducer);
    diagramEventProducer = new DiagramEventProducer(kafka);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should publish diagram.created event with correct topic', () => {
    it('sends message to diagram.created topic', async () => {
      await diagramEventProducer.connect();
      await diagramEventProducer.publishDiagramCreated(makeValidPayload());

      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'diagram.created',
        })
      );
    });
  });

  describe('should include all required fields in event payload', () => {
    it('serialized message contains eventId, timestamp, diagram, and user', async () => {
      await diagramEventProducer.connect();
      const payload = makeValidPayload();

      await diagramEventProducer.publishDiagramCreated(payload);

      const sentMessages = mockProducer.send.mock.calls[0][0].messages;
      expect(sentMessages).toHaveLength(1);

      const parsedEvent = JSON.parse(sentMessages[0].value as string);
      expect(parsedEvent).toHaveProperty('eventId');
      expect(parsedEvent).toHaveProperty('timestamp');
      expect(parsedEvent).toHaveProperty('diagram');
      expect(parsedEvent).toHaveProperty('user');
      expect(parsedEvent.diagram.id).toBe(payload.diagram.id);
      expect(parsedEvent.diagram.fileName).toBe(payload.diagram.fileName);
      expect(parsedEvent.diagram.fileType).toBe(payload.diagram.fileType);
      expect(parsedEvent.diagram.fileSize).toBe(payload.diagram.fileSize);
      expect(parsedEvent.diagram.storageUrl).toBe(payload.diagram.storageUrl);
      expect(parsedEvent.user.id).toBe(payload.user.id);
      expect(parsedEvent.user.name).toBe(payload.user.name);
      expect(parsedEvent.user.email).toBe(payload.user.email);
    });
  });

  describe('should generate unique eventId for each event', () => {
    it('produces different eventIds for successive calls', async () => {
      await diagramEventProducer.connect();
      const payload = makeValidPayload();

      const event1 = await diagramEventProducer.publishDiagramCreated(payload);
      const event2 = await diagramEventProducer.publishDiagramCreated(payload);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('eventId is a non-empty string', async () => {
      await diagramEventProducer.connect();

      const event = await diagramEventProducer.publishDiagramCreated(makeValidPayload());

      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
    });
  });

  describe('should set timestamp to ISO-8601 format', () => {
    it('timestamp matches ISO-8601 pattern', async () => {
      await diagramEventProducer.connect();

      const event = await diagramEventProducer.publishDiagramCreated(makeValidPayload());

      expect(event.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('timestamp is recent (within last 5 seconds)', async () => {
      await diagramEventProducer.connect();
      const before = Date.now();

      const event = await diagramEventProducer.publishDiagramCreated(makeValidPayload());

      const after = Date.now();
      const eventTime = new Date(event.timestamp).getTime();
      expect(eventTime).toBeGreaterThanOrEqual(before);
      expect(eventTime).toBeLessThanOrEqual(after);
    });
  });

  describe('should throw when Kafka is unavailable', () => {
    it('throws KafkaProducerError when producer.send fails', async () => {
      mockProducer.send.mockRejectedValue(new Error('KafkaJSProtocolError: Connection timeout'));
      await diagramEventProducer.connect();

      await expect(
        diagramEventProducer.publishDiagramCreated(makeValidPayload())
      ).rejects.toThrow(KafkaProducerError);
    });

    it('KafkaProducerError message includes original error details', async () => {
      mockProducer.send.mockRejectedValue(new Error('Broker unavailable'));
      await diagramEventProducer.connect();

      await expect(
        diagramEventProducer.publishDiagramCreated(makeValidPayload())
      ).rejects.toThrow(/Broker unavailable/);
    });
  });

  describe('should connect to Kafka before publishing', () => {
    it('calls producer.connect on connect()', async () => {
      await diagramEventProducer.connect();

      expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('should disconnect after publishing', () => {
    it('calls producer.disconnect on disconnect()', async () => {
      await diagramEventProducer.connect();
      await diagramEventProducer.publishDiagramCreated(makeValidPayload());
      await diagramEventProducer.disconnect();

      expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
