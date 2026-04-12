import mongoose, { Schema, Document } from 'mongoose';
import { Message, MessageProps, MessageRole } from '../../domain/entities/Message';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';

interface MessageDocument extends Document {
  messageId: string;
  sessionId: string;
  content: string;
  role: string;
  timestamp: Date;
  attachments?: { diagramId: string; fileName: string; fileType: string }[];
}

const MessageSchema = new Schema<MessageDocument>({
  messageId: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  role: { type: String, required: true },
  timestamp: { type: Date, required: true },
  attachments: [
    {
      diagramId: String,
      fileName: String,
      fileType: String,
    },
  ],
});

const MessageModel = mongoose.model<MessageDocument>('Message', MessageSchema);

export class MessageRepository implements IMessageRepository {
  async save(message: Message): Promise<void> {
    const doc = new MessageModel(message.toJSON());
    await doc.save();
  }

  async findBySessionId(sessionId: string): Promise<Message[]> {
    const docs = await MessageModel.find({ sessionId }).sort({ timestamp: 1 });
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: MessageDocument): Message {
    const props: MessageProps = {
      messageId: doc.messageId,
      sessionId: doc.sessionId,
      content: doc.content,
      role: doc.role as MessageRole,
      timestamp: doc.timestamp,
      attachments: doc.attachments,
    };
    return new Message(props);
  }
}
