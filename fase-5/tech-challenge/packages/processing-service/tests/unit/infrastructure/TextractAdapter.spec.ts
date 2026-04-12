import { TextractAdapter } from '../../../src/infrastructure/textract/TextractAdapter';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

jest.mock('@aws-sdk/client-textract', () => ({
  TextractClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  AnalyzeDocumentCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const MockTextractClient = jest.mocked(TextractClient);
const MockAnalyzeDocumentCommand = jest.mocked(AnalyzeDocumentCommand);

const STORAGE_URL = 'https://arch-bucket.s3.us-east-1.amazonaws.com/1234567890-diagram.png';

describe('TextractAdapter', () => {
  let mockSend: jest.Mock;
  let adapter: TextractAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    MockTextractClient.mockImplementation(() => ({ send: mockSend }) as unknown as TextractClient);
    adapter = new TextractAdapter('us-east-1');
  });

  describe('extractText', () => {
    it('should extract and join LINE blocks as plain text', async () => {
      mockSend.mockResolvedValue({
        Blocks: [
          { BlockType: 'LINE', Text: 'API Gateway' },
          { BlockType: 'LINE', Text: 'User Service' },
          { BlockType: 'WORD', Text: 'API' },
          { BlockType: 'LINE', Text: 'MongoDB' },
        ],
      });

      const text = await adapter.extractText(STORAGE_URL);

      expect(text).toBe('API Gateway\nUser Service\nMongoDB');
    });

    it('should ignore non-LINE blocks', async () => {
      mockSend.mockResolvedValue({
        Blocks: [
          { BlockType: 'PAGE', Text: undefined },
          { BlockType: 'WORD', Text: 'foo' },
          { BlockType: 'LAYOUT_FIGURE', Text: undefined },
          { BlockType: 'LINE', Text: 'valid line' },
        ],
      });

      const text = await adapter.extractText(STORAGE_URL);

      expect(text).toBe('valid line');
    });

    it('should return empty string when no LINE blocks exist', async () => {
      mockSend.mockResolvedValue({
        Blocks: [{ BlockType: 'WORD', Text: 'foo' }],
      });

      const text = await adapter.extractText(STORAGE_URL);

      expect(text).toBe('');
    });

    it('should return empty string when Blocks is undefined', async () => {
      mockSend.mockResolvedValue({});

      const text = await adapter.extractText(STORAGE_URL);

      expect(text).toBe('');
    });

    it('should parse bucket name from S3 URL', async () => {
      mockSend.mockResolvedValue({ Blocks: [] });

      await adapter.extractText(STORAGE_URL);

      const [commandArg] = MockAnalyzeDocumentCommand.mock.calls[0];
      expect(commandArg.Document!.S3Object!.Bucket).toBe('arch-bucket');
    });

    it('should parse object key from S3 URL', async () => {
      mockSend.mockResolvedValue({ Blocks: [] });

      await adapter.extractText(STORAGE_URL);

      const [commandArg] = MockAnalyzeDocumentCommand.mock.calls[0];
      expect(commandArg.Document!.S3Object!.Name).toBe('1234567890-diagram.png');
    });

    it('should use LAYOUT feature type', async () => {
      mockSend.mockResolvedValue({ Blocks: [] });

      await adapter.extractText(STORAGE_URL);

      const [commandArg] = MockAnalyzeDocumentCommand.mock.calls[0];
      expect(commandArg.FeatureTypes).toEqual(['LAYOUT']);
    });

    it('should throw when Textract SDK fails', async () => {
      mockSend.mockRejectedValue(new Error('InvalidS3ObjectException'));

      await expect(adapter.extractText(STORAGE_URL)).rejects.toThrow('InvalidS3ObjectException');
    });
  });
});
