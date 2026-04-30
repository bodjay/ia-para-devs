import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { randomUUID } from 'crypto';
import { Message } from '../../domain/entities/Message';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import { ChatRequestedProducer } from '../kafka/ChatRequestedProducer';
import { SessionSocketMap } from './SessionSocketMap';

interface ChatMessage {
  type: 'chat';
  question: string;
}

export class WebSocketServer {
  private wss: WSServer;

  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly analysisRepository: IAnalysisRepository,
    private readonly chatProducer: ChatRequestedProducer,
    private readonly sessionSocketMap: SessionSocketMap
  ) {
    this.wss = new WSServer({ noServer: true });
  }

  attach(httpServer: Server): void {
    httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
      const url = req.url ?? '';
      const match = url.match(/^\/ws\/sessions\/([^/?]+)/);
      if (!match) {
        socket.destroy();
        return;
      }
      const sessionId = match[1];
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req, sessionId);
      });
    });

    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage, sessionId: string) => {
      this.sessionSocketMap.set(sessionId, ws);
      console.log(`[WebSocket] Session connected: ${sessionId}`);

      ws.on('message', (data) => {
        this.handleMessage(sessionId, ws, data.toString()).catch((err) =>
          console.error('[WebSocket] Message handling error:', (err as Error).message)
        );
      });

      ws.on('close', () => {
        this.sessionSocketMap.delete(sessionId);
        console.log(`[WebSocket] Session disconnected: ${sessionId}`);
      });
    });
  }

  private async handleMessage(sessionId: string, ws: WebSocket, raw: string): Promise<void> {
    let msg: ChatMessage;
    try {
      msg = JSON.parse(raw) as ChatMessage;
    } catch {
      return;
    }
    if (msg.type !== 'chat' || !msg.question) return;

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      this.send(ws, { type: 'error', message: 'Session not found' });
      return;
    }

    const userMessage = new Message({
      messageId: randomUUID(),
      sessionId,
      content: msg.question,
      role: 'user',
      timestamp: new Date(),
    });
    await this.messageRepository.save(userMessage);

    this.send(ws, {
      type: 'user_message',
      messageId: userMessage.messageId,
      content: userMessage.content,
      role: 'user',
      timestamp: userMessage.timestamp.toISOString(),
    });

    const immediateResponse = await this.resolveImmediateResponse(session, msg.question);

    if (immediateResponse) {
      const assistantMessage = new Message({
        messageId: randomUUID(),
        sessionId,
        content: immediateResponse,
        role: 'assistant',
        timestamp: new Date(),
      });
      await this.messageRepository.save(assistantMessage);
      session.touch();
      await this.sessionRepository.update(session);
      this.send(ws, {
        type: 'assistant_message',
        messageId: assistantMessage.messageId,
        content: assistantMessage.content,
        role: 'assistant',
        timestamp: assistantMessage.timestamp.toISOString(),
        route: 'no_analysis',
      });
      return;
    }

    const analysis = await this.analysisRepository.findById(session.analysisId!);
    const history = await this.buildHistory(sessionId, userMessage.messageId);

    await this.chatProducer.publish({
      sessionId,
      question: msg.question,
      history,
      analysisContext: analysis?.result
        ? {
            summary: analysis.result.summary,
            components: analysis.result.components,
            risks: analysis.result.risks,
            recommendations: analysis.result.recommendations,
          }
        : null,
    });
  }

  private async resolveImmediateResponse(
    session: { analysisId?: string },
    _question: string
  ): Promise<string | null> {
    if (!session.analysisId) {
      return 'Mensagem recebida. Para iniciar uma análise, faça o upload de um diagrama de arquitetura.';
    }

    const analysis = await this.analysisRepository.findById(session.analysisId);
    if (!analysis) return 'Análise não encontrada. Faça o upload de um novo diagrama.';
    if (analysis.status === 'pending') return 'Análise iniciando, aguarde alguns instantes...';
    if (analysis.status === 'processing') return 'Análise em andamento, aguarde o resultado...';
    if (analysis.status === 'failed') {
      return `A análise falhou: ${analysis.error?.message ?? 'erro desconhecido'}. Faça o upload novamente.`;
    }

    return null;
  }

  private async buildHistory(
    sessionId: string,
    excludeMessageId: string
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await this.messageRepository.findBySessionId(sessionId);
    return messages
      .filter((m) => m.messageId !== excludeMessageId)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  private send(ws: WebSocket, data: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}
