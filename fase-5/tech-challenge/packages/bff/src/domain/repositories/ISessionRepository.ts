import { Session } from '../entities/Session';

export interface ISessionRepository {
  save(session: Session): Promise<void>;
  findAll(): Promise<Session[]>;
  findById(id: string): Promise<Session | null>;
  update(session: Session): Promise<void>;
}
