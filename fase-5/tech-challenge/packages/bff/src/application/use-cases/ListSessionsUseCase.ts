import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IListSessionsUseCase, SessionRecord } from '../../domain/use-cases/IListSessionsUseCase';

export class ListSessionsUseCase implements IListSessionsUseCase {
  constructor(private readonly repository: ISessionRepository) {}

  async execute(): Promise<SessionRecord[]> {
    const sessions = await this.repository.findAll();
    return sessions.map((s) => ({
      sessionId: s.sessionId,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      lastActiveAt: s.lastActiveAt.toISOString(),
      diagramId: s.diagramId,
      analysisId: s.analysisId,
    }));
  }
}
