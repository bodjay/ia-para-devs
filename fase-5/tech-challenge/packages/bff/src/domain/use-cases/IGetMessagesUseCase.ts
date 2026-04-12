import { MessageProps } from '../entities/Message';

export type MessageRecord = Omit<MessageProps, 'timestamp'> & {
  id: string;
  timestamp: string;
};

export interface IGetMessagesUseCase {
  execute(sessionId: string): Promise<MessageRecord[]>;
}
