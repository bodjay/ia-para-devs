import { Kafka, Producer } from 'kafkajs';
import { IAnalysisCompletedProducer, AnalysisCompletedEvent } from '../../application/ports/IAnalysisCompletedProducer';

export class KafkaProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'KafkaProducerError';
  }
}

export class AnalysisCompletedProducer implements IAnalysisCompletedProducer {
  private producer: Producer;
  private readonly topic = 'analysis.completed';

  constructor(private readonly kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishAnalysisCompleted(event: AnalysisCompletedEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: event.diagramId,
            value: JSON.stringify(event),
          },
        ],
      });
    } catch (error) {
      throw new KafkaProducerError(
        `Failed to publish analysis.completed event: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
