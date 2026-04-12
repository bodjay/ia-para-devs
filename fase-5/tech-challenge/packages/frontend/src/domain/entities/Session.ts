import { Message, MessageProps } from './Message';

export interface SessionProps {
  id?: string;
  name: string;
  createdAt?: string;
  lastActiveAt?: string;
  messages?: MessageProps[];
  diagramId?: string;
}

export class Session {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  lastActiveAt: string;
  private _messages: Message[];
  diagramId?: string;

  constructor(props: SessionProps) {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Session name cannot be empty');
    }

    this.id = props.id ?? crypto.randomUUID();
    this.name = props.name.trim();
    this.createdAt = props.createdAt ?? new Date().toISOString();
    this.lastActiveAt = props.lastActiveAt ?? this.createdAt;
    this.diagramId = props.diagramId;
    this._messages = (props.messages ?? []).map((m) => new Message(m));
  }

  get messages(): Message[] {
    return [...this._messages];
  }

  addMessage(messageProps: MessageProps): Message {
    const message = new Message({ ...messageProps, sessionId: this.id });
    this._messages.push(message);
    this.lastActiveAt = new Date().toISOString();
    return message;
  }

  toPlainObject(): SessionProps & { id: string } {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      lastActiveAt: this.lastActiveAt,
      messages: this._messages.map((m) => m.toPlainObject()),
      diagramId: this.diagramId,
    };
  }
}
