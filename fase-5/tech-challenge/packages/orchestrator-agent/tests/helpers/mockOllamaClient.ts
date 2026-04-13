import { OllamaClient } from '../../src/infrastructure/ai/OllamaClient';

export function createMockOllamaClient(response: string = ''): jest.Mocked<OllamaClient> {
  const mock = {
    baseUrl: 'http://localhost:11434',
    model: 'qwen3:4b',
    timeoutMs: 120000,
    chat: jest.fn().mockResolvedValue(response),
  } as unknown as jest.Mocked<OllamaClient>;

  return mock;
}
