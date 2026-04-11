import { MessageAttachment } from '../entities/Message';
import { MessageRecord } from './IGetMessagesUseCase';

export interface CreateMessageInput {
  sessionId: string;
  content: string;
  attachments?: MessageAttachment[];
}

export interface ICreateMessageUseCase {
  execute(input: CreateMessageInput): Promise<MessageRecord>;
}
