import { DiagramEventProducer, StreamProducerError } from '../../../src/infrastructure/redis/DiagramEventProducer';
import { getRedisClient } from '../../../src/infrastructure/redis/RedisClient';

jest.mock('../../../src/infrastructure/redis/RedisClient');

const makeMockRedis = () => ({
  xadd: jest.fn().mockResolvedValue('1704067200000-0'),
});

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
  let mockRedis: ReturnType<typeof makeMockRedis>;
  let producer: DiagramEventProducer;

  beforeEach(() => {
    mockRedis = makeMockRedis();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    producer = new DiagramEventProducer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should publish to streams:diagram:created stream', () => {
    it('calls xadd on the correct stream key', async () => {
      await producer.publishDiagramCreated(makeValidPayload());

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        'streams:diagram:created',
        expect.any(String), // MAXLEN
        expect.any(String), // ~
        expect.any(String), // 10000
        '*',
        'data',
        expect.any(String),
      );
    });
  });

  describe('should include all required fields in event payload', () => {
    it('serialized data contains eventId, timestamp, diagram, and user', async () => {
      const payload = makeValidPayload();

      await producer.publishDiagramCreated(payload);

      const rawData = (mockRedis.xadd.mock.calls[0] as string[]).at(-1) as string;
      const parsedEvent = JSON.parse(rawData);

      expect(parsedEvent).toHaveProperty('eventId');
      expect(parsedEvent).toHaveProperty('timestamp');
      expect(parsedEvent.diagram.id).toBe(payload.diagram.id);
      expect(parsedEvent.diagram.fileName).toBe(payload.diagram.fileName);
      expect(parsedEvent.diagram.fileSize).toBe(payload.diagram.fileSize);
      expect(parsedEvent.user.id).toBe(payload.user.id);
      expect(parsedEvent.user.email).toBe(payload.user.email);
    });
  });

  describe('should generate unique eventId for each event', () => {
    it('produces different eventIds for successive calls', async () => {
      const payload = makeValidPayload();

      const event1 = await producer.publishDiagramCreated(payload);
      const event2 = await producer.publishDiagramCreated(payload);

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('should set timestamp to ISO-8601 format', () => {
    it('timestamp matches ISO-8601 pattern', async () => {
      const event = await producer.publishDiagramCreated(makeValidPayload());

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('should throw when Redis is unavailable', () => {
    it('throws StreamProducerError when xadd fails', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Connection timeout'));

      await expect(
        producer.publishDiagramCreated(makeValidPayload())
      ).rejects.toThrow(StreamProducerError);
    });

    it('StreamProducerError message includes original error details', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Redis unavailable'));

      await expect(
        producer.publishDiagramCreated(makeValidPayload())
      ).rejects.toThrow(/Redis unavailable/);
    });
  });
});
