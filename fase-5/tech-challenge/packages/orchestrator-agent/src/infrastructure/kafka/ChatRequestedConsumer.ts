import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { OrchestrateUseCase } from '../../application/use-cases/OrchestrateUseCase';
import { ChatRespondedProducer } from './ChatRespondedProducer';
import { OrchestratorInput } from '../../domain/entities/OrchestratorState';
import { Logger } from '@arch-analyzer/common';

interface ChatRequestedEvent {
  correlationId: string;
  sessionId: string;
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  analysisContext: OrchestratorInput['analysisContext'];
}

const logger = new Logger('chat-requested-consumer');

export class ChatRequestedConsumer {
  private consumer: Consumer;
  private readonly topic = 'chat.requested';
  private readonly groupId = 'orchestrator-agent-group';

  constructor(
    private readonly kafka: Kafka,
    private readonly orchestrateUseCase: OrchestrateUseCase,
    private readonly producer: ChatRespondedProducer
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 180_000,
      heartbeatInterval: 3_000,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async (rawPayload: EachMessagePayload) => {
        const payload = rawPayload as EachMessagePayload & {
          commitOffsetsIfNecessary?(): Promise<void>;
        };
        const keepAlive = setInterval(() => void payload.heartbeat(), 5_000);
        try {
          await this.processMessage(payload);
          await payload.commitOffsetsIfNecessary?.();
        } catch (error) {
          logger.error('Message processing failed, offset not committed (will retry)', {
            error: (error as Error).message,
          });
        } finally {
          clearInterval(keepAlive);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const rawValue = payload.message.value?.toString();
    if (!rawValue) return;

    let event: ChatRequestedEvent;
    try {
      event = JSON.parse(rawValue) as ChatRequestedEvent;
    } catch {
      logger.error('Failed to parse chat.requested message');
      return;
    }

    logger.info('Processing chat request', {
      correlationId: event.correlationId,
      sessionId: event.sessionId,
      hasContext: !!event.analysisContext,
    });

    const output = await this.orchestrateUseCase.execute({
      question: event.question,
      analysisContext: event.analysisContext,
      history: event.history,
    });

    await this.producer.publishChatResponded(event.correlationId, event.sessionId, output);

    logger.info('Chat response published', {
      correlationId: event.correlationId,
      route: output.route,
    });
  }
}
