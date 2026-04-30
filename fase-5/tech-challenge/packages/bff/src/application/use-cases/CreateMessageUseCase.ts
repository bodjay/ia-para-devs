import { randomUUID } from 'crypto';
import { Message } from '../../domain/entities/Message';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IOrchestratorClient } from '../../domain/services/IOrchestratorClient';
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
    private readonly orchestratorClient: IOrchestratorClient
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

    const assistantContent = await this.generateResponse(
      session.analysisId,
      input.content,
      input.sessionId
    );

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

  private async generateResponse(
    analysisId: string | undefined,
    question: string,
    sessionId: string
  ): Promise<string> {
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

    const history = await this.buildHistory(sessionId);
    const { response } = await this.orchestratorClient.chat(
      analysis.result ?? null,
      question,
      history
    );
    return response;
  }

  private async buildHistory(sessionId: string) {
    const messages = await this.messageRepository.findBySessionId(sessionId);
    const previous = messages.slice(0, -1);
    return previous.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }
}
