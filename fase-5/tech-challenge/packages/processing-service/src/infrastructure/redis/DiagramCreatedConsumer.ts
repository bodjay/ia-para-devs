import Redis from 'ioredis';
import { getRedisClient } from './RedisClient';
import { IProcessDiagramUseCase, DiagramCreatedEvent } from '../../domain/use-cases/IProcessDiagramUseCase';

const STREAM = 'streams:diagram:created';
const GROUP = 'processing-service-group';

export class DiagramCreatedConsumer {
  private running = false;
  private readonly consumerName = `consumer-${process.pid}`;
  private redis!: Redis;

  constructor(private readonly processUseCase: IProcessDiagramUseCase) {}

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
          console.error('[DiagramCreatedConsumer] Poll error:', (err as Error).message);
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
      console.error('[DiagramCreatedConsumer] Empty message, id:', id);
      await this.redis.xack(STREAM, GROUP, id);
      return;
    }

    let event: DiagramCreatedEvent;
    try {
      event = JSON.parse(raw) as DiagramCreatedEvent;
    } catch {
      console.error('[DiagramCreatedConsumer] Failed to parse message, id:', id);
      await this.redis.xack(STREAM, GROUP, id);
      return;
    }

    try {
      await this.processUseCase.execute(event);
      await this.redis.xack(STREAM, GROUP, id);
    } catch (err) {
      console.error(
        '[DiagramCreatedConsumer] Processing failed, message will be retried:',
        (err as Error).message,
      );
    }
  }
}
