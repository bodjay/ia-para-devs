type MessageHandler = (event: WebSocketEvent) => void;

export interface WebSocketEvent {
  type: 'user_message' | 'assistant_message' | 'error';
  messageId?: string;
  content?: string;
  role?: 'user' | 'assistant';
  timestamp?: string;
  route?: string;
  message?: string;
}

const BFF_URL = process.env.REACT_APP_BFF_URL ?? 'http://localhost:3001';

function toWsUrl(httpUrl: string, sessionId: string): string {
  const base = httpUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/ws/sessions/${sessionId}`;
}

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private onMessage: MessageHandler;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(sessionId: string, onMessage: MessageHandler) {
    this.sessionId = sessionId;
    this.onMessage = onMessage;
    this.connect();
  }

  private connect(): void {
    const url = toWsUrl(BFF_URL, this.sessionId);
    this.ws = new WebSocket(url);

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as WebSocketEvent;
        this.onMessage(data);
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };
  }

  send(question: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'chat', question }));
    }
  }

  destroy(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
