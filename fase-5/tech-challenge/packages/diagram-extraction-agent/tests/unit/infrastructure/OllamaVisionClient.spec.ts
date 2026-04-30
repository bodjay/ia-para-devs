import { OllamaVisionClient } from '../../../src/infrastructure/ai/OllamaVisionClient';
import { ProcessingServiceClient } from '../../../src/infrastructure/tools/ProcessingServiceClient';
import { VisionExtractionResponse } from '../../../src/infrastructure/ai/IVisionClient';

const STORAGE_URL = 'https://arch-bucket.s3.us-east-1.amazonaws.com/diagram.png';
const OCR_TEXT = 'API Gateway User Service MongoDB';

const makeVisionResponse = (overrides: Partial<VisionExtractionResponse> = {}): VisionExtractionResponse => ({
  extractedText: OCR_TEXT,
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

const makeOllamaFinalResponse = (content: VisionExtractionResponse) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: { role: 'assistant', content: JSON.stringify(content) } }),
  } as unknown as Response);

const makeOllamaToolCallResponse = (toolName: string, args: Record<string, unknown>) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: toolName, arguments: args } }],
        },
      }),
  } as unknown as Response);

describe('OllamaVisionClient', () => {
  let processingClient: jest.Mocked<ProcessingServiceClient>;
  let client: OllamaVisionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    processingClient = {
      ocr: jest.fn().mockResolvedValue(OCR_TEXT),
      createJob: jest.fn().mockResolvedValue('job-001'),
      updateJob: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProcessingServiceClient>;

    client = new OllamaVisionClient(processingClient, 'http://localhost:11434', 'qwen3:2b');
  });

  describe('extractFromUrl', () => {
    it('should send request to Ollama /api/chat endpoint', async () => {
      mockFetch.mockResolvedValueOnce(makeOllamaFinalResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send qwen3:2b model with tools in request body', async () => {
      mockFetch.mockResolvedValueOnce(makeOllamaFinalResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.model).toBe('qwen3:2b');
      expect(body.stream).toBe(false);
      expect(body.tools).toHaveLength(1);
      expect(body.tools[0].function.name).toBe('ocr_extract');
    });

    it('should include storageUrl in the user prompt', async () => {
      mockFetch.mockResolvedValueOnce(makeOllamaFinalResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.messages[0].content).toContain(STORAGE_URL);
    });

    it('should call ocr_extract tool via ProcessingServiceClient when model requests it', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOllamaToolCallResponse('ocr_extract', { s3_url: STORAGE_URL }))
        .mockResolvedValueOnce(makeOllamaFinalResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png');

      expect(processingClient.ocr).toHaveBeenCalledWith(STORAGE_URL);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return parsed VisionExtractionResponse from final Ollama response', async () => {
      const expected = makeVisionResponse();
      mockFetch.mockResolvedValueOnce(makeOllamaFinalResponse(expected));

      const result = await client.extractFromUrl(STORAGE_URL, 'image/png');

      expect(result.extractedText).toBe(expected.extractedText);
      expect(result.elements).toHaveLength(2);
      expect(result.connections).toHaveLength(1);
    });

    it('should include pre-extracted text in prompt when provided', async () => {
      mockFetch.mockResolvedValueOnce(makeOllamaFinalResponse(makeVisionResponse()));

      await client.extractFromUrl(STORAGE_URL, 'image/png', 'Pre-extracted: service-a service-b');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.messages[0].content).toContain('Pre-extracted: service-a service-b');
    });

    it('should throw when Ollama API returns non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
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
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(client.extractFromUrl(STORAGE_URL, 'image/png')).rejects.toThrow('timeout');
    });

    it('should strip markdown code fences from response content', async () => {
      const expected = makeVisionResponse();
      mockFetch.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              message: { role: 'assistant', content: '```json\n' + JSON.stringify(expected) + '\n```' },
            }),
        } as unknown as Response)
      );

      const result = await client.extractFromUrl(STORAGE_URL, 'image/png');
      expect(result.extractedText).toBe(expected.extractedText);
    });
  });
});
