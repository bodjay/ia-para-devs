import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { OrchestratorOutput } from '../../domain/entities/OrchestratorState';

export class KafkaProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'KafkaProducerError';
  }
}

export interface ChatRespondedEvent {
  eventId: string;
  timestamp: string;
  correlationId: string;
  sessionId: string;
  response: string;
  route: string;
}

export class ChatRespondedProducer {
  private producer: Producer;
  private readonly topic = 'chat.responded';

  constructor(private readonly kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishChatResponded(
    correlationId: string,
    sessionId: string,
    output: OrchestratorOutput
  ): Promise<void> {
    const event: ChatRespondedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      correlationId,
      sessionId,
      response: output.response,
      route: output.route,
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{ key: sessionId, value: JSON.stringify(event) }],
      });
    } catch (error) {
      throw new KafkaProducerError(
        `Failed to publish chat.responded event: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
