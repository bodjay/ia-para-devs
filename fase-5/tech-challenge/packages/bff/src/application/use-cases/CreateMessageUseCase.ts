import { randomUUID } from 'crypto';
import { Message } from '../../domain/entities/Message';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IConversationClient } from '../../domain/services/IConversationClient';
import {
  CreateMessageInput,
  ICreateMessageUseCase,
} from '../../domain/use-cases/ICreateMessageUseCase';
import { MessageRecord } from '../../domain/use-cases/IGetMessagesUseCase';

export class CreateMessageUseCase implements ICreateMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly analysisRepository: IAnalysisRepository,
    private readonly conversationClient: IConversationClient
  ) {}

  async execute(input: CreateMessageInput): Promise<MessageRecord> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    const userMessage = new Message({
      messageId: randomUUID(),
      sessionId: input.sessionId,
      content: input.content,
      role: 'user',
      timestamp: new Date(),
      attachments: input.attachments,
    });
    await this.messageRepository.save(userMessage);

    const assistantContent = await this.generateResponse(session.analysisId, input.content, input.sessionId);

    const assistantMessage = new Message({
      messageId: randomUUID(),
      sessionId: input.sessionId,
      content: assistantContent,
      role: 'assistant',
      timestamp: new Date(),
    });
    await this.messageRepository.save(assistantMessage);

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

  private async generateResponse(analysisId: string | undefined, question: string, sessionId: string): Promise<string> {
    if (!analysisId) {
      return 'Mensagem recebida. Para iniciar uma análise, faça o upload de um diagrama de arquitetura.';
    }

    const analysis = await this.analysisRepository.findById(analysisId);
    if (!analysis) {
      return 'Análise não encontrada. Faça o upload de um novo diagrama.';
    }

    if (analysis.status === 'pending') {
      return 'Análise iniciando, aguarde alguns instantes...';
    }
    if (analysis.status === 'processing') {
      return 'Análise em andamento, aguarde o resultado...';
    }
    if (analysis.status === 'failed') {
      return `A análise falhou: ${analysis.error?.message ?? 'erro desconhecido'}. Faça o upload novamente.`;
    }

    // status === 'completed'
    const result = analysis.result;
    if (!result) {
      return 'Análise concluída mas sem resultado disponível.';
    }

    const history = await this.buildHistory(sessionId);
    return this.conversationClient.chat(result, question, history);
  }

  private async buildHistory(sessionId: string) {
    const messages = await this.messageRepository.findBySessionId(sessionId);
    // exclude the last user message we just saved — it's passed as `question`
    const previous = messages.slice(0, -1);
    return previous.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }
}
