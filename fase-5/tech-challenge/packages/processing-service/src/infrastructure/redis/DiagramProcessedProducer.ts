import { getRedisClient } from './RedisClient';
import { v4 as uuidv4 } from 'uuid';
import { DiagramConnection, DiagramElement } from '../../domain/entities/ProcessingJob';

export class StreamProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StreamProducerError';
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
    connections?: DiagramConnection[];
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

const STREAM = 'streams:diagram:processed';

export class DiagramProcessedProducer {
  async publishDiagramProcessed(payload: DiagramProcessedEventPayload): Promise<DiagramProcessedEvent> {
    const event: DiagramProcessedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      diagram: payload.diagram,
      processing: payload.processing,
      ...(payload.error && { error: payload.error }),
    };

    try {
      const redis = getRedisClient();
      await redis.xadd(STREAM, 'MAXLEN', '~', '10000', '*', 'data', JSON.stringify(event));
    } catch (error) {
      throw new StreamProducerError(
        `Failed to publish to ${STREAM}: ${(error as Error).message}`,
        error as Error,
      );
    }

    return event;
  }
}
