import { getRedisClient } from './RedisClient';
import { v4 as uuidv4 } from 'uuid';

export class StreamProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StreamProducerError';
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

const STREAM = 'streams:diagram:created';

export class DiagramEventProducer {
  async publishDiagramCreated(payload: DiagramCreatedEventPayload): Promise<DiagramCreatedEvent> {
    const event: DiagramCreatedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      diagram: payload.diagram,
      user: payload.user,
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
