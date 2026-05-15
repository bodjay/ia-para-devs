import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IRenameSessionUseCase } from '../../domain/use-cases/IRenameSessionUseCase';

export class RenameSessionUseCase implements IRenameSessionUseCase {
  constructor(private readonly repository: ISessionRepository) {}

  async execute({
    sessionId,
    name,
  }: {
    sessionId: string;
    name: string;
  }): Promise<{ sessionId: string; name: string }> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.rename(name);
    await this.repository.update(session);
    return { sessionId: session.sessionId, name: session.name };
  }
}
