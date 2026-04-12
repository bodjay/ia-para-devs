export type MessageRole = 'user' | 'assistant';

export interface MessageAttachment {
  diagramId: string;
  fileName: string;
  fileType: string;
  previewUrl?: string;
}

export interface MessageProps {
  id?: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  timestamp?: string;
  attachments?: MessageAttachment[];
}

export class Message {
  readonly id: string;
  readonly sessionId: string;
  readonly content: string;
  readonly role: MessageRole;
  readonly timestamp: string;
  readonly attachments: MessageAttachment[];

  constructor(props: MessageProps) {
    if (!props.content || props.content.trim() === '') {
      throw new Error('content cannot be empty');
    }

    if (!props.sessionId || props.sessionId.trim() === '') {
      throw new Error('sessionId cannot be empty');
    }

    if (props.role !== 'user' && props.role !== 'assistant') {
      throw new Error(`Invalid role: ${props.role}. Must be 'user' or 'assistant'`);
    }

    this.id = props.id ?? crypto.randomUUID();
    this.sessionId = props.sessionId;
    this.content = props.content.trim();
    this.role = props.role;
    this.timestamp = props.timestamp ?? new Date().toISOString();
    this.attachments = props.attachments ?? [];
  }

  toPlainObject(): MessageProps & { id: string } {
    return {
      id: this.id,
      sessionId: this.sessionId,
      content: this.content,
      role: this.role,
      timestamp: this.timestamp,
      attachments: this.attachments,
    };
  }
}
