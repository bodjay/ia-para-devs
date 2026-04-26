import { WebSocket } from 'ws';

export class SessionSocketMap {
  private readonly map = new Map<string, WebSocket>();

  set(sessionId: string, ws: WebSocket): void {
    this.map.set(sessionId, ws);
  }

  get(sessionId: string): WebSocket | undefined {
    return this.map.get(sessionId);
  }

  delete(sessionId: string): void {
    this.map.delete(sessionId);
  }

  send(sessionId: string, data: object): boolean {
    const ws = this.map.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(data));
    return true;
  }
}
