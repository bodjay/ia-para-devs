import { Consumer, Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import { Message } from '../../domain/entities/Message';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { SessionSocketMap } from '../websocket/SessionSocketMap';

interface ChatRespondedEvent {
  eventId: string;
  timestamp: string;
  correlationId: string;
  sessionId: string;
  response: string;
  route: string;
}

export class ChatRespondedConsumer {
  private consumer: Consumer;
  private readonly topic = 'chat.responded';

  constructor(
    kafka: Kafka,
    private readonly messageRepository: IMessageRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly sessionSocketMap: SessionSocketMap,
    private readonly groupId: string = 'bff-chat-group'
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 30_000,
      heartbeatInterval: 3_000,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  async start(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        let event: ChatRespondedEvent;
        try {
          event = JSON.parse(raw) as ChatRespondedEvent;
        } catch {
          console.error('[ChatRespondedConsumer] Failed to parse message');
          return;
        }

        const assistantMessage = new Message({
          messageId: randomUUID(),
          sessionId: event.sessionId,
          content: event.response,
          role: 'assistant',
          timestamp: new Date(),
        });

        await this.messageRepository.save(assistantMessage);

        const session = await this.sessionRepository.findById(event.sessionId);
        if (session) {
          session.touch();
          await this.sessionRepository.update(session);
        }

        this.sessionSocketMap.send(event.sessionId, {
          type: 'assistant_message',
          messageId: assistantMessage.messageId,
          content: assistantMessage.content,
          role: 'assistant',
          timestamp: assistantMessage.timestamp.toISOString(),
          route: event.route,
        });

        console.log(`[ChatRespondedConsumer] Response delivered to session ${event.sessionId}`);
      },
    });
  }
}
