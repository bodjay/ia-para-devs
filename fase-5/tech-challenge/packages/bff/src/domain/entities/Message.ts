export type MessageRole = 'user' | 'assistant';

export interface MessageAttachment {
  diagramId: string;
  fileName: string;
  fileType: string;
}

export interface MessageProps {
  messageId: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export class Message {
  readonly messageId: string;
  readonly sessionId: string;
  readonly content: string;
  readonly role: MessageRole;
  readonly timestamp: Date;
  readonly attachments: MessageAttachment[];

  constructor(props: MessageProps) {
    if (!props.messageId || props.messageId.trim() === '') {
      throw new Error('messageId is required');
    }
    if (!props.sessionId || props.sessionId.trim() === '') {
      throw new Error('sessionId is required');
    }
    if (!props.content || props.content.trim() === '') {
      throw new Error('content is required');
    }
    if (props.role !== 'user' && props.role !== 'assistant') {
      throw new Error(`Invalid role: ${props.role}. Must be 'user' or 'assistant'`);
    }

    this.messageId = props.messageId;
    this.sessionId = props.sessionId;
    this.content = props.content.trim();
    this.role = props.role;
    this.timestamp = props.timestamp;
    this.attachments = props.attachments ?? [];
  }

  toJSON(): MessageProps {
    return {
      messageId: this.messageId,
      sessionId: this.sessionId,
      content: this.content,
      role: this.role,
      timestamp: this.timestamp,
      attachments: this.attachments,
    };
  }
}
