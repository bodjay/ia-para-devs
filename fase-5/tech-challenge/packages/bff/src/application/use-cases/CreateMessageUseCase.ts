import { randomUUID } from 'crypto';
import { Message } from '../../domain/entities/Message';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import {
  CreateMessageInput,
  ICreateMessageUseCase,
} from '../../domain/use-cases/ICreateMessageUseCase';
import { MessageRecord } from '../../domain/use-cases/IGetMessagesUseCase';

export class CreateMessageUseCase implements ICreateMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(input: CreateMessageInput): Promise<MessageRecord> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    // Persist user message
    const userMessage = new Message({
      messageId: randomUUID(),
      sessionId: input.sessionId,
      content: input.content,
      role: 'user',
      timestamp: new Date(),
      attachments: input.attachments,
    });
    await this.messageRepository.save(userMessage);

    // Generate assistant acknowledgment
    const assistantContent = session.analysisId
      ? `Análise em andamento (ID: ${session.analysisId}). Aguarde o resultado ou faça uma nova pergunta sobre o diagrama.`
      : 'Mensagem recebida. Para iniciar uma análise, faça o upload de um diagrama de arquitetura.';

    const assistantMessage = new Message({
      messageId: randomUUID(),
      sessionId: input.sessionId,
      content: assistantContent,
      role: 'assistant',
      timestamp: new Date(),
    });
    await this.messageRepository.save(assistantMessage);

    // Touch session
    session.touch();
    await this.sessionRepository.update(session);

    return {
      id: assistantMessage.messageId,
      messageId: assistantMessage.messageId,
      sessionId: assistantMessage.sessionId,
      content: assistantMessage.content,
      role: assistantMessage.role,
      timestamp: assistantMessage.timestamp.toISOString(),
      attachments: assistantMessage.attachments,
    };
  }
}
