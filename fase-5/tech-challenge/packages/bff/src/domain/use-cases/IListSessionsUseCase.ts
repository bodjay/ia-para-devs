import { SessionProps } from '../entities/Session';

export type SessionRecord = Omit<SessionProps, 'createdAt' | 'lastActiveAt'> & {
  createdAt: string;
  lastActiveAt: string;
};

export interface IListSessionsUseCase {
  execute(): Promise<SessionRecord[]>;
}
