import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

export class KafkaProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'KafkaProducerError';
  }
}

export interface DiagramCreatedEventPayload {
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageUrl: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DiagramCreatedEvent {
  eventId: string;
  timestamp: string;
  diagram: DiagramCreatedEventPayload['diagram'];
  user: DiagramCreatedEventPayload['user'];
}

export class DiagramEventProducer {
  private producer: Producer;
  private readonly topic = 'diagram.created';

  constructor(private readonly kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishDiagramCreated(payload: DiagramCreatedEventPayload): Promise<DiagramCreatedEvent> {
    const event: DiagramCreatedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      diagram: payload.diagram,
      user: payload.user,
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: payload.diagram.id,
            value: JSON.stringify(event),
          },
        ],
      });
    } catch (error) {
      throw new KafkaProducerError(
        `Failed to publish diagram.created event: ${(error as Error).message}`,
        error as Error
      );
    }

    return event;
  }
}
