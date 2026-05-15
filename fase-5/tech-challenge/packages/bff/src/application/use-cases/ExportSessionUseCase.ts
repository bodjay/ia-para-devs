import { Logger } from '@arch-analyzer/common';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import { IExportSessionUseCase } from '../../domain/use-cases/IExportSessionUseCase';
import { IOrchestratorClient } from '../../domain/services/IOrchestratorClient';

const logger = new Logger('export-session-use-case');

export class ExportSessionUseCase implements IExportSessionUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly analysisRepository: IAnalysisRepository,
    private readonly orchestratorClient: IOrchestratorClient
  ) {}

  async execute(sessionId: string): Promise<{ text: string }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const [messages, analysis] = await Promise.all([
      this.messageRepository.findBySessionId(sessionId),
      session.analysisId ? this.analysisRepository.findById(session.analysisId) : null,
    ]);

    const conversationTopics = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content);

    const payload = {
      sessionName: session.name,
      conversationTopics,
      ...(analysis?.result
        ? {
            analysis: {
              summary: analysis.result.summary,
              components: analysis.result.components.map((c) => `${c.name} (${c.type})`),
              risks: analysis.result.risks.map((r) => `[${r.severity}] ${r.title}`),
              recommendations: analysis.result.recommendations.map(
                (r) => `[${r.priority}] ${r.title}`
              ),
            },
          }
        : {}),
    };

    try {
      return await this.orchestratorClient.exportContext(payload);
    } catch (err) {
      logger.error('Orchestrator export failed, using fallback', { error: (err as Error).message });
      return this.buildFallback(session.name, analysis?.result?.summary);
    }
  }

  private buildFallback(sessionName: string, summary?: string): { text: string } {
    const lines = [
      `# Contexto da sessão: ${sessionName}`,
      `Exportado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
    ];
    if (summary) {
      lines.push('## Resumo da análise', '', summary, '');
    }
    return { text: lines.join('\n') };
  }
}
