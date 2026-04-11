import { randomUUID } from 'crypto';
import { Session } from '../../domain/entities/Session';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import {
  CreateSessionInput,
  ICreateSessionUseCase,
} from '../../domain/use-cases/ICreateSessionUseCase';
import { SessionRecord } from '../../domain/use-cases/IListSessionsUseCase';

export class CreateSessionUseCase implements ICreateSessionUseCase {
  constructor(private readonly repository: ISessionRepository) {}

  async execute(input: CreateSessionInput): Promise<SessionRecord> {
    if (!input.name || input.name.trim() === '') {
      throw new Error('Session name is required');
    }

    const now = new Date();
    const session = new Session({
      sessionId: input.sessionId ?? randomUUID(),
      name: input.name,
      createdAt: now,
      lastActiveAt: now,
    });

    await this.repository.save(session);

    return {
      sessionId: session.sessionId,
      name: session.name,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
    };
  }
}
