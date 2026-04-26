import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

export interface ChatRequestedPayload {
  correlationId: string;
  sessionId: string;
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  analysisContext: {
    summary: string;
    components: unknown[];
    risks: unknown[];
    recommendations: unknown[];
  } | null;
}

class KafkaProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'KafkaProducerError';
  }
}

export class ChatRequestedProducer {
  private producer: Producer;
  private readonly topic = 'chat.requested';

  constructor(private readonly kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(payload: Omit<ChatRequestedPayload, 'correlationId'>): Promise<string> {
    const correlationId = uuidv4();
    const event: ChatRequestedPayload = { correlationId, ...payload };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{ key: payload.sessionId, value: JSON.stringify(event) }],
      });
    } catch (error) {
      throw new KafkaProducerError(
        `Failed to publish chat.requested: ${(error as Error).message}`,
        error as Error
      );
    }

    return correlationId;
  }
}
