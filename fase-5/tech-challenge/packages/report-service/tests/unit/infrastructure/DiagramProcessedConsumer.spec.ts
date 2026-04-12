import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { DiagramProcessedConsumer, DiagramProcessedEvent } from '../../../src/infrastructure/kafka/DiagramProcessedConsumer';
import { IGenerateReportUseCase } from '../../../src/domain/use-cases/IGenerateReportUseCase';

const makeValidEvent = (overrides: Partial<DiagramProcessedEvent> = {}): DiagramProcessedEvent => ({
  eventId: 'evt-001',
  timestamp: new Date().toISOString(),
  diagram: {
    id: 'diagram-001',
    fileName: 'architecture.png',
    fileType: 'image/png',
    storageUrl: 'https://storage.example.com/diagrams/architecture.png',
  },
  processing: {
    status: 'processed',
    extractedText: 'api-gateway -> user-service -> mongodb',
    elements: [
      { type: 'microservice', label: 'api-gateway', position: { x: 100, y: 100 } },
      { type: 'microservice', label: 'user-service', position: { x: 300, y: 100 } },
      { type: 'database', label: 'mongodb', position: { x: 500, y: 100 } },
    ],
  },
  ...overrides,
});

function buildEachMessagePayload(value: string | null): EachMessagePayload {
  return {
    topic: 'diagram.processed',
    partition: 0,
    message: {
      key: Buffer.from('diagram-001'),
      value: value !== null ? Buffer.from(value) : null,
      timestamp: Date.now().toString(),
      attributes: 0,
      offset: '0',
      size: value ? value.length : 0,
    },
    heartbeat: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
  };
}

describe('DiagramProcessedConsumer', () => {
  let kafka: jest.Mocked<Kafka>;
  let consumer: jest.Mocked<Consumer>;
  let generateReportUseCase: jest.Mocked<IGenerateReportUseCase>;
  let diagramProcessedConsumer: DiagramProcessedConsumer;
  let capturedEachMessage: (payload: EachMessagePayload) => Promise<void>;

  beforeEach(() => {
    consumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockImplementation(async ({ eachMessage }) => {
        capturedEachMessage = eachMessage;
      }),
    } as unknown as jest.Mocked<Consumer>;

    kafka = {
      consumer: jest.fn().mockReturnValue(consumer),
    } as unknown as jest.Mocked<Kafka>;

    generateReportUseCase = {
      execute: jest.fn().mockResolvedValue({
        reportId: 'report-001',
        analysisId: 'analysis-001',
        diagramId: 'diagram-001',
        status: 'completed',
      }),
    };

    diagramProcessedConsumer = new DiagramProcessedConsumer(kafka, generateReportUseCase);
  });

  describe('subscription', () => {
    it('should subscribe to "diagram.processed" topic', async () => {
      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      expect(consumer.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'diagram.processed' })
      );
    });
  });

  describe('message handling', () => {
    it('should call GenerateReportUseCase when message received', async () => {
      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      const payload = buildEachMessagePayload(JSON.stringify(makeValidEvent()));
      await capturedEachMessage(payload);

      expect(generateReportUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should parse message payload correctly', async () => {
      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      const event = makeValidEvent();
      const payload = buildEachMessagePayload(JSON.stringify(event));
      await capturedEachMessage(payload);

      expect(generateReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          diagramId: 'diagram-001',
          fileName: 'architecture.png',
          fileType: 'image/png',
          storageUrl: 'https://storage.example.com/diagrams/architecture.png',
          extractedText: 'api-gateway -> user-service -> mongodb',
        })
      );
    });

    it('should skip processing when processing.status is "failed"', async () => {
      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      const event = makeValidEvent({ processing: { status: 'failed', extractedText: '', elements: [] } });
      const payload = buildEachMessagePayload(JSON.stringify(event));
      await capturedEachMessage(payload);

      expect(generateReportUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle deserialization error gracefully', async () => {
      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      const payload = buildEachMessagePayload('this-is-not-json{{{');

      await expect(capturedEachMessage(payload)).resolves.not.toThrow();
      expect(generateReportUseCase.execute).not.toHaveBeenCalled();
    });

    it('should commit offset after successful processing', async () => {
      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      const heartbeat = jest.fn().mockResolvedValue(undefined);
      const payload: EachMessagePayload = {
        ...buildEachMessagePayload(JSON.stringify(makeValidEvent())),
        heartbeat,
      };

      await capturedEachMessage(payload);

      expect(heartbeat).toHaveBeenCalled();
    });

    it('should not commit offset when processing fails', async () => {
      generateReportUseCase.execute.mockRejectedValueOnce(new Error('Use case failed'));

      await diagramProcessedConsumer.connect();
      await diagramProcessedConsumer.start();

      const heartbeat = jest.fn().mockResolvedValue(undefined);
      const payload: EachMessagePayload = {
        ...buildEachMessagePayload(JSON.stringify(makeValidEvent())),
        heartbeat,
      };

      await expect(capturedEachMessage(payload)).rejects.toThrow('Use case failed');
      expect(heartbeat).not.toHaveBeenCalled();
    });
  });
});
