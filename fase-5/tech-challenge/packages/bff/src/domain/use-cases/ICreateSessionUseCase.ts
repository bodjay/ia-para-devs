import { SessionRecord } from './IListSessionsUseCase';

export interface CreateSessionInput {
  name: string;
  sessionId?: string;
}

export interface ICreateSessionUseCase {
  execute(input: CreateSessionInput): Promise<SessionRecord>;
}
