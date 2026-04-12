import { Kafka, Producer } from 'kafkajs';
import { AnalysisCompletedProducer, KafkaProducerError } from '../../../src/infrastructure/kafka/AnalysisCompletedProducer';
import { AnalysisCompletedEvent } from '../../../src/application/ports/IAnalysisCompletedProducer';

const makeCompletedEvent = (overrides: Partial<AnalysisCompletedEvent> = {}): AnalysisCompletedEvent => ({
  eventId: 'evt-completed-001',
  timestamp: new Date().toISOString(),
  analysisId: 'analysis-abc-123',
  diagramId: 'diagram-001',
  status: 'completed',
  result: {
    components: [
      { name: 'api-gateway', type: 'microservice', description: 'Entry point' },
      { name: 'user-service', type: 'microservice', description: 'User management' },
      { name: 'mongodb', type: 'database', description: 'Primary database' },
    ],
    risks: [
      { title: 'Single Point of Failure', description: 'api-gateway has no replica', severity: 'high', affectedComponents: ['api-gateway'] },
    ],
    recommendations: [
      { title: 'Add Load Balancer', description: 'Deploy multiple instances', priority: 'high', relatedRisks: ['Single Point of Failure'] },
    ],
    summary: 'Microservices architecture with one high risk identified.',
  },
  ...overrides,
});

describe('AnalysisCompletedProducer', () => {
  let kafka: jest.Mocked<Kafka>;
  let producer: jest.Mocked<Producer>;
  let analysisCompletedProducer: AnalysisCompletedProducer;

  beforeEach(() => {
    producer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Producer>;

    kafka = {
      producer: jest.fn().mockReturnValue(producer),
    } as unknown as jest.Mocked<Kafka>;

    analysisCompletedProducer = new AnalysisCompletedProducer(kafka);
  });

  describe('publishing', () => {
    it('should publish to "analysis.completed" topic', async () => {
      await analysisCompletedProducer.publishAnalysisCompleted(makeCompletedEvent());

      expect(producer.send).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'analysis.completed' })
      );
    });

    it('should include analysisId and diagramId', async () => {
      await analysisCompletedProducer.publishAnalysisCompleted(makeCompletedEvent());

      const sendCall = producer.send.mock.calls[0][0];
      const parsedValue = JSON.parse(sendCall.messages[0].value as string);

      expect(parsedValue.analysisId).toBe('analysis-abc-123');
      expect(parsedValue.diagramId).toBe('diagram-001');
    });

    it('should include result with components, risks, recommendations, summary', async () => {
      await analysisCompletedProducer.publishAnalysisCompleted(makeCompletedEvent());

      const sendCall = producer.send.mock.calls[0][0];
      const parsedValue = JSON.parse(sendCall.messages[0].value as string);

      expect(parsedValue.result.components).toHaveLength(3);
      expect(parsedValue.result.risks).toHaveLength(1);
      expect(parsedValue.result.recommendations).toHaveLength(1);
      expect(parsedValue.result.summary).toContain('Microservices');
    });

    it('should set status to "completed" on success', async () => {
      await analysisCompletedProducer.publishAnalysisCompleted(makeCompletedEvent({ status: 'completed' }));

      const sendCall = producer.send.mock.calls[0][0];
      const parsedValue = JSON.parse(sendCall.messages[0].value as string);

      expect(parsedValue.status).toBe('completed');
    });

    it('should set status to "failed" with error details on failure', async () => {
      const failedEvent = makeCompletedEvent({
        status: 'failed',
        result: undefined,
        error: { code: 'ANALYSIS_FAILED', message: 'Claude API unreachable' },
      });

      await analysisCompletedProducer.publishAnalysisCompleted(failedEvent);

      const sendCall = producer.send.mock.calls[0][0];
      const parsedValue = JSON.parse(sendCall.messages[0].value as string);

      expect(parsedValue.status).toBe('failed');
      expect(parsedValue.error.code).toBe('ANALYSIS_FAILED');
      expect(parsedValue.error.message).toBe('Claude API unreachable');
    });

    it('should serialize payload as JSON', async () => {
      await analysisCompletedProducer.publishAnalysisCompleted(makeCompletedEvent());

      const sendCall = producer.send.mock.calls[0][0];
      const messageValue = sendCall.messages[0].value as string;

      expect(() => JSON.parse(messageValue)).not.toThrow();
      const parsed = JSON.parse(messageValue);
      expect(typeof parsed).toBe('object');
    });

    it('should throw when Kafka is unavailable', async () => {
      producer.send.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(
        analysisCompletedProducer.publishAnalysisCompleted(makeCompletedEvent())
      ).rejects.toThrow(KafkaProducerError);
    });
  });
});
