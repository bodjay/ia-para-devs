import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { IGetMessagesUseCase, MessageRecord } from '../../domain/use-cases/IGetMessagesUseCase';

export class GetMessagesUseCase implements IGetMessagesUseCase {
  constructor(private readonly repository: IMessageRepository) {}

  async execute(sessionId: string): Promise<MessageRecord[]> {
    const messages = await this.repository.findBySessionId(sessionId);
    return messages.map((m) => ({
      id: m.messageId,
      messageId: m.messageId,
      sessionId: m.sessionId,
      content: m.content,
      role: m.role,
      timestamp: m.timestamp.toISOString(),
      attachments: m.attachments,
    }));
  }
}
