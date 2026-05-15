import Redis from 'ioredis';
import { getRedisClient } from './RedisClient';
import { AnalyzeArchitectureUseCase } from '../../application/use-cases/AnalyzeArchitectureUseCase';
import { AnalysisCompletedProducer } from '../kafka/AnalysisCompletedProducer';
import { ComponentType } from '../../domain/entities/ArchitectureAnalysis';

interface DiagramProcessedEvent {
  eventId: string;
  timestamp: string;
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    storageUrl: string;
  };
  processing: {
    status: 'processed' | 'failed';
    extractedText?: string;
    elements?: Array<{
      id: string;
      label: string;
      type: ComponentType;
    }>;
    connections?: Array<{
      fromElementId: string;
      toElementId: string;
      type: 'sync' | 'async' | 'unknown';
    }>;
  };
  error?: { code: string; message: string };
}

const STREAM = 'streams:diagram:processed';
const GROUP = 'analysis-agent-group';

export class DiagramProcessedConsumer {
  private running = false;
  private readonly consumerName = `consumer-${process.pid}`;
  private redis!: Redis;

  constructor(
    private readonly analyzeUseCase: AnalyzeArchitectureUseCase,
    private readonly producer: AnalysisCompletedProducer,
  ) {}

  async connect(): Promise<void> {
    this.redis = getRedisClient();
    await this.redis
      .xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM')
      .catch((err: Error) => {
        if (!err.message.includes('BUSYGROUP')) throw err;
      });
  }

  async subscribe(): Promise<void> {
    // no-op — stream subscription is implicit in XREADGROUP
  }

  async start(): Promise<void> {
    this.running = true;
    void this.runLoop();
  }

  async disconnect(): Promise<void> {
    this.running = false;
  }

  private async runLoop(): Promise<void> {
    await this.processPending();

    while (this.running) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP', GROUP, this.consumerName,
          'COUNT', '1', 'BLOCK', '2000',
          'STREAMS', STREAM, '>',
        ) as [string, [string, string[]][]][] | null;

        if (!results) continue;

        for (const [, messages] of results) {
          for (const [id, fields] of messages) {
            await this.processEntry(id, fields);
          }
        }
      } catch (err) {
        if (this.running) {
          console.error('[DiagramProcessedConsumer] Poll error:', (err as Error).message);
        }
      }
    }
  }

  private async processPending(): Promise<void> {
    const results = await this.redis.xreadgroup(
      'GROUP', GROUP, this.consumerName,
      'COUNT', '100',
      'STREAMS', STREAM, '0',
    ) as [string, [string, string[]][]][] | null;

    if (!results) return;
    for (const [, messages] of results) {
      for (const [id, fields] of messages) {
        await this.processEntry(id, fields);
      }
    }
  }

  private async processEntry(id: string, fields: string[]): Promise<void> {
    const dataIndex = fields.indexOf('data');
    const raw = dataIndex !== -1 ? fields[dataIndex + 1] : undefined;

    if (!raw) {
      console.error('[DiagramProcessedConsumer] Empty message, id:', id);
      await this.redis.xack(STREAM, GROUP, id);
      return;
    }

    let event: DiagramProcessedEvent;
    try {
      event = JSON.parse(raw) as DiagramProcessedEvent;
    } catch {
      console.error('[DiagramProcessedConsumer] Failed to parse message, id:', id);
      await this.redis.xack(STREAM, GROUP, id);
      return;
    }

    try {
      const result = await this.analyzeUseCase.execute({
        action: 'analyze',
        payload: {
          diagramId: event.diagram.id,
          extractedText: event.processing.extractedText,
          elements: (event.processing.elements ?? []).map((el) => ({
            id: el.id,
            label: el.label,
            type: el.type,
          })),
          connections: (event.processing.connections ?? []).map((c) => ({
            fromElementId: c.fromElementId,
            toElementId: c.toElementId,
            type: c.type,
          })),
        },
      });

      await this.producer.publishAnalysisCompleted(result);
      await this.redis.xack(STREAM, GROUP, id);
    } catch (err) {
      console.error(
        '[DiagramProcessedConsumer] Processing failed, message will be retried:',
        (err as Error).message,
      );
    }
  }
}
