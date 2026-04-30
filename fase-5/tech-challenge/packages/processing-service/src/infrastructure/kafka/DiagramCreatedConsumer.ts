import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IProcessDiagramUseCase, DiagramCreatedEvent } from '../../domain/use-cases/IProcessDiagramUseCase';

export class DiagramCreatedConsumer {
  private consumer: Consumer;
  private readonly topic = 'diagram.created';
  private readonly groupId = 'processing-service-group';

  constructor(
    private readonly kafka: Kafka,
    private readonly processUseCase: IProcessDiagramUseCase
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 420_000,  // 7 min — covers the 6 min extraction agent timeout
      heartbeatInterval: 3_000,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async (rawPayload: EachMessagePayload) => {
        const payload = rawPayload as EachMessagePayload & {
          commitOffsetsIfNecessary?(): Promise<void>;
        };
        const keepAlive = setInterval(() => void payload.heartbeat(), 10_000);
        try {
          await this.processMessage(payload);
          await payload.commitOffsetsIfNecessary?.();
        } catch (error) {
          console.error(
            '[DiagramCreatedConsumer] Message processing failed, offset not committed (will retry):',
            (error as Error).message
          );
        } finally {
          clearInterval(keepAlive);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    const rawValue = message.value?.toString();
    if (!rawValue) {
      console.error('Received empty message in diagram.created topic');
      return;
    }

    let event: DiagramCreatedEvent;
    try {
      event = JSON.parse(rawValue) as DiagramCreatedEvent;
    } catch (error) {
      console.error('Failed to deserialize diagram.created message:', error);
      return;
    }

    await this.processUseCase.execute(event);
  }
}
