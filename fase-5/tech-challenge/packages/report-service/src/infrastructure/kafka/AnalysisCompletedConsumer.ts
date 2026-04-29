import { Consumer, Kafka } from 'kafkajs';
import { AnalysisCompletedEvent } from '../../application/ports/IAnalysisCompletedProducer';
import { StoreAnalysisReportUseCase } from '../../application/use-cases/StoreAnalysisReportUseCase';

export class AnalysisCompletedConsumer {
  private consumer: Consumer;
  private readonly topic = 'analysis.completed';

  constructor(
    private readonly kafka: Kafka,
    private readonly storeReportUseCase: StoreAnalysisReportUseCase,
    private readonly groupId: string = 'report-service-group'
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

        const heartbeatTimer = setInterval(() => heartbeat().catch(() => {}), 8000);
        try {
          await this.storeReportUseCase.execute(event);
        } finally {
          clearInterval(heartbeatTimer);
        }

        await heartbeat();
      },
    });
  }
}
