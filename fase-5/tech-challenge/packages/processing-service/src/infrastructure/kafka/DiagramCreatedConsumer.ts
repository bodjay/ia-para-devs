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
    this.consumer = kafka.consumer({ groupId: this.groupId });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload);
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { message, heartbeat } = payload;
    const commitOffsetsIfNecessary = (payload as EachMessagePayload & { commitOffsetsIfNecessary(): Promise<void> }).commitOffsetsIfNecessary;

    let event: DiagramCreatedEvent;

    try {
      const rawValue = message.value?.toString();
      if (!rawValue) {
        console.error('Received empty message in diagram.created topic');
        return;
      }
      event = JSON.parse(rawValue) as DiagramCreatedEvent;
    } catch (error) {
      console.error('Failed to deserialize diagram.created message:', error);
      return;
    }

    try {
      await this.processUseCase.execute(event);
      await commitOffsetsIfNecessary();
    } catch (error) {
      console.error('Failed to process diagram.created event:', error);
      // Do not commit offset - message will be reprocessed
    }
  }
}
