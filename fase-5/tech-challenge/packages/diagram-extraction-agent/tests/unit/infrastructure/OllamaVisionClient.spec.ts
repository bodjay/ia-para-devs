import { OllamaVisionClient } from '../../../src/infrastructure/ai/OllamaVisionClient';
import { VisionExtractionResponse } from '../../../src/infrastructure/ai/IVisionClient';

const STORAGE_URL = 'https://arch-bucket.s3.us-east-1.amazonaws.com/diagram.png';

const makeVisionResponse = (overrides: Partial<VisionExtractionResponse> = {}): VisionExtractionResponse => ({
  extractedText: 'API Gateway User Service MongoDB',
  elements: [
    { id: 'el-1', label: 'API Gateway', type: 'microservice', confidence: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
    { id: 'el-2', label: 'MongoDB', type: 'database', confidence: 0.95, boundingBox: { x: 200, y: 10, width: 80, height: 50 } },
  ],
  connections: [
    { fromElementId: 'el-1', toElementId: 'el-2', type: 'sync', label: 'query' },
  ],
  ...overrides,
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

const makeImageFetchResponse = () =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
  } as unknown as Response);

const makeOllamaApiResponse = (content: VisionExtractionResponse) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: { content: JSON.stringify(content) } }),
  } as unknown as Response);

describe('OllamaVisionClient', () => {
  let client: OllamaVisionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new OllamaVisionClient('http://localhost:11434', 'llava');
  });

  describe('extractFromUrl', () => {
    it('should fetch image from storageUrl and send as base64 to Ollama', async () => {
      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockResolvedValueOnce(makeOllamaApiResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe(STORAGE_URL);
    });

    it('should send request to Ollama /api/chat endpoint', async () => {
      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockResolvedValueOnce(makeOllamaApiResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      expect(mockFetch.mock.calls[1][0]).toBe('http://localhost:11434/api/chat');
    });

    it('should send correct model, message, and image to Ollama', async () => {
      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockResolvedValueOnce(makeOllamaApiResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
      expect(requestBody.model).toBe('llava');
      expect(requestBody.stream).toBe(false);
      expect(requestBody.messages[0].role).toBe('user');
      expect(requestBody.messages[0].images).toHaveLength(1);
    });

    it('should include extractedText in prompt when provided', async () => {
      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockResolvedValueOnce(makeOllamaApiResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png', 'API Gateway MongoDB');

      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
      expect(requestBody.messages[0].content).toContain('API Gateway MongoDB');
    });

    it('should return parsed VisionExtractionResponse from Ollama content', async () => {
      const expectedResponse = makeVisionResponse();
      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockResolvedValueOnce(makeOllamaApiResponse(expectedResponse));

      const result = await client.extractFromUrl(STORAGE_URL, 'image/png');

      expect(result.extractedText).toBe(expectedResponse.extractedText);
      expect(result.elements).toHaveLength(2);
      expect(result.connections).toHaveLength(1);
    });

    it('should throw when image fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as unknown as Response);

      await expect(client.extractFromUrl(STORAGE_URL, 'image/png')).rejects.toThrow(
        'Invalid URL: failed to fetch image'
      );
    });

    it('should throw when Ollama API returns non-ok status', async () => {
      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        } as unknown as Response);

      await expect(client.extractFromUrl(STORAGE_URL, 'image/png')).rejects.toThrow(
        'Ollama API returned status 500'
      );
    });

    it('should throw timeout error when fetch is aborted', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      mockFetch
        .mockResolvedValueOnce(makeImageFetchResponse())
        .mockRejectedValueOnce(abortError);

      await expect(client.extractFromUrl(STORAGE_URL, 'image/png')).rejects.toThrow('timeout');
    });
  });
});
