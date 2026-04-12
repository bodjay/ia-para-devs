import { Message } from '../entities/Message';

export interface IMessageRepository {
  save(message: Message): Promise<void>;
  findBySessionId(sessionId: string): Promise<Message[]>;
}
