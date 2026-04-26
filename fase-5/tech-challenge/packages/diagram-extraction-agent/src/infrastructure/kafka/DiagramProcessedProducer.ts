import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { DiagramElement } from '../../domain/entities/DiagramElement';
import { ElementConnection } from '../../domain/entities/ExtractionResult';

export class KafkaProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'KafkaProducerError';
  }
}

export interface DiagramProcessedEventPayload {
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    storageUrl: string;
  };
  processing: {
    status: 'processed' | 'failed';
    extractedText?: string;
    elements?: DiagramElement[];
    connections?: ElementConnection[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface DiagramProcessedEvent {
  eventId: string;
  timestamp: string;
  diagram: DiagramProcessedEventPayload['diagram'];
  processing: DiagramProcessedEventPayload['processing'];
  error?: DiagramProcessedEventPayload['error'];
}

export class DiagramProcessedProducer {
  private producer: Producer;
  private readonly topic = 'diagram.processed';

  constructor(private readonly kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishDiagramProcessed(
    payload: DiagramProcessedEventPayload
  ): Promise<DiagramProcessedEvent> {
    const event: DiagramProcessedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      diagram: payload.diagram,
      processing: payload.processing,
      ...(payload.error && { error: payload.error }),
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{ key: payload.diagram.id, value: JSON.stringify(event) }],
      });
    } catch (error) {
      throw new KafkaProducerError(
        `Failed to publish diagram.processed event: ${(error as Error).message}`,
        error as Error
      );
    }

    return event;
  }
}
