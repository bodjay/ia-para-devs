import { Consumer, Kafka } from 'kafkajs';
import { VectorizeReportUseCase } from '../../application/use-cases/VectorizeReportUseCase';
import { AnalysisCompletedEvent } from './AnalysisCompletedEvent';

export class AnalysisCompletedConsumer {
  private consumer: Consumer;
  private readonly topic = 'analysis.completed';
  private readonly groupId = 'vector-service-group';

  constructor(
    private readonly kafka: Kafka,
    private readonly vectorizeUseCase: VectorizeReportUseCase
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 300000,
      heartbeatInterval: 10000,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  async start(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message, heartbeat }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        let event: AnalysisCompletedEvent;
        try {
          event = JSON.parse(raw) as AnalysisCompletedEvent;
        } catch {
          console.error('[AnalysisCompletedConsumer] Failed to parse analysis.completed message');
          return;
        }

        if (event.status !== 'completed' || !event.result) return;

        const heartbeatTimer = setInterval(() => heartbeat().catch(() => {}), 8000);
        try {
          await this.vectorizeUseCase.execute({
            diagramId: event.diagramId,
            analysisId: event.analysisId,
            summary: event.result.summary,
            components: event.result.components,
            risks: event.result.risks,
            recommendations: event.result.recommendations,
          });
        } finally {
          clearInterval(heartbeatTimer);
        }

        await heartbeat();
      },
    });
  }
}
