import { DiagramCreatedConsumer } from '../../../src/infrastructure/redis/DiagramCreatedConsumer';
import { IProcessDiagramUseCase, DiagramCreatedEvent } from '../../../src/domain/use-cases/IProcessDiagramUseCase';
import { getRedisClient } from '../../../src/infrastructure/redis/RedisClient';

jest.mock('../../../src/infrastructure/redis/RedisClient');

const STREAM = 'streams:diagram:created';
const GROUP = 'processing-service-group';

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

const makeMockRedis = () => ({
  xgroup: jest.fn().mockResolvedValue('OK'),
  xreadgroup: jest.fn().mockResolvedValue(null),
  xack: jest.fn().mockResolvedValue(1),
});

const makeMockUseCase = (): jest.Mocked<IProcessDiagramUseCase> => ({
  execute: jest.fn().mockResolvedValue(undefined),
});

describe('DiagramCreatedConsumer', () => {
  let mockRedis: ReturnType<typeof makeMockRedis>;
  let mockUseCase: jest.Mocked<IProcessDiagramUseCase>;
  let consumer: DiagramCreatedConsumer;

  beforeEach(() => {
    mockRedis = makeMockRedis();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    mockUseCase = makeMockUseCase();
    consumer = new DiagramCreatedConsumer(mockUseCase);
  });

  afterEach(async () => {
    await consumer.disconnect();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('creates consumer group with MKSTREAM on connect', async () => {
      await consumer.connect();

      expect(mockRedis.xgroup).toHaveBeenCalledWith(
        'CREATE', STREAM, GROUP, '$', 'MKSTREAM',
      );
    });

    it('ignores BUSYGROUP error when group already exists', async () => {
      mockRedis.xgroup.mockRejectedValue(new Error('BUSYGROUP Consumer Group already exists'));

      await expect(consumer.connect()).resolves.not.toThrow();
    });

    it('re-throws non-BUSYGROUP errors', async () => {
      mockRedis.xgroup.mockRejectedValue(new Error('WRONGTYPE unexpected error'));

      await expect(consumer.connect()).rejects.toThrow('WRONGTYPE unexpected error');
    });
  });

  describe('message processing', () => {
    it('calls useCase.execute and xack after successful processing', async () => {
      const event = makeValidEvent();
      const messageId = '1704067200000-0';
      const fields = ['data', JSON.stringify(event)];

      let callCount = 0;
      // Return pending=empty, then one new message, then block forever
      mockRedis.xreadgroup.mockImplementation(async (...args: unknown[]) => {
        const lastArg = args[args.length - 1] as string;
        if (lastArg === '0') return null; // no pending messages
        if (callCount++ === 0) {
          return [[STREAM, [[messageId, fields]]]];
        }
        await new Promise((r) => setTimeout(r, 10_000)); // simulate BLOCK
        return null;
      });

      const processingDone = new Promise<void>((resolve) => {
        mockRedis.xack.mockImplementation(async () => {
          resolve();
          return 1;
        });
      });

      await consumer.connect();
      await consumer.start();

      await processingDone;
      await consumer.disconnect();

      expect(mockUseCase.execute).toHaveBeenCalledWith(event);
      expect(mockRedis.xack).toHaveBeenCalledWith(STREAM, GROUP, messageId);
    });

    it('does not xack when useCase.execute throws', async () => {
      const event = makeValidEvent();
      const messageId = '1704067200000-1';
      const fields = ['data', JSON.stringify(event)];

      let callCount = 0;
      const processAttempted = new Promise<void>((resolve) => {
        mockUseCase.execute.mockImplementation(async () => {
          resolve();
          throw new Error('Processing failed');
        });
      });

      mockRedis.xreadgroup.mockImplementation(async (...args: unknown[]) => {
        const lastArg = args[args.length - 1] as string;
        if (lastArg === '0') return null;
        if (callCount++ === 0) {
          return [[STREAM, [[messageId, fields]]]];
        }
        await new Promise((r) => setTimeout(r, 10_000));
        return null;
      });

      await consumer.connect();
      await consumer.start();

      await processAttempted;
      // Give a tick for any potential xack call
      await new Promise((r) => setImmediate(r));
      await consumer.disconnect();

      expect(mockRedis.xack).not.toHaveBeenCalled();
    });

    it('acks and skips message with invalid JSON', async () => {
      const messageId = '1704067200000-2';
      const fields = ['data', 'not-valid-json{'];

      let callCount = 0;
      const ackCalled = new Promise<void>((resolve) => {
        mockRedis.xack.mockImplementation(async () => {
          resolve();
          return 1;
        });
      });

      mockRedis.xreadgroup.mockImplementation(async (...args: unknown[]) => {
        const lastArg = args[args.length - 1] as string;
        if (lastArg === '0') return null;
        if (callCount++ === 0) {
          return [[STREAM, [[messageId, fields]]]];
        }
        await new Promise((r) => setTimeout(r, 10_000));
        return null;
      });

      await consumer.connect();
      await consumer.start();

      await ackCalled;
      await consumer.disconnect();

      expect(mockUseCase.execute).not.toHaveBeenCalled();
      expect(mockRedis.xack).toHaveBeenCalledWith(STREAM, GROUP, messageId);
    });
  });

  describe('subscribe', () => {
    it('is a no-op that resolves without error', async () => {
      await consumer.connect();
      await expect(consumer.subscribe()).resolves.not.toThrow();
    });
  });
});
