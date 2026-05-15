import { Logger } from '@arch-analyzer/common';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const logger = new Logger('ollama-client');

export class OllamaClient {
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly routerTimeoutMs: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
    this.timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '300000', 10);
    this.routerTimeoutMs = parseInt(process.env.OLLAMA_ROUTER_TIMEOUT_MS ?? '45000', 10);
  }

  async chat(messages: ChatMessage[], timeoutOverrideMs?: number): Promise<string> {
    const timeout = timeoutOverrideMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    logger.info('Sending chat request', { model: this.model, messages: messages.length });

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, stream: false }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logger.error('Ollama returned non-OK status', { status: response.status, model: this.model });
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const content = data.message?.content ?? '';
      logger.info('Chat response received', { model: this.model, responseLength: content.length });
      return content;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        logger.error('Ollama request timed out', { model: this.model, timeoutMs: timeout });
        throw new Error(`Ollama request timed out after ${timeout}ms`);
      }
      logger.error('Ollama request failed', { model: this.model, error: (err as Error).message });
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
