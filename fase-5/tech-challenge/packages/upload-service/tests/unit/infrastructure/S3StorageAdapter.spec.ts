import { S3StorageAdapter } from '../../../src/infrastructure/storage/S3StorageAdapter';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StorageError } from '../../../src/infrastructure/storage/IStorageAdapter';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const MockS3Client = jest.mocked(S3Client);
const MockPutObjectCommand = jest.mocked(PutObjectCommand);

const BUCKET = 'arch-analyzer-bucket';
const REGION = 'us-east-1';

describe('S3StorageAdapter', () => {
  let mockSend: jest.Mock;
  let adapter: S3StorageAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn().mockResolvedValue({});
    MockS3Client.mockImplementation(() => ({ send: mockSend }) as unknown as S3Client);
    adapter = new S3StorageAdapter(BUCKET, REGION);
  });

  describe('upload', () => {
    it('should upload file and return public S3 URL', async () => {
      const file = {
        name: 'architecture.png',
        size: 1024,
        type: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      };

      const url = await adapter.upload(file);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(url).toMatch(new RegExp(`^https://${BUCKET}\\.s3\\.${REGION}\\.amazonaws\\.com/`));
      expect(url).toContain('architecture.png');
    });

    it('should include timestamp prefix in object key', async () => {
      const file = { name: 'diagram.png', size: 512, type: 'image/png', buffer: Buffer.from('data') };

      const url = await adapter.upload(file);

      const key = url.split('/').pop()!;
      expect(key).toMatch(/^\d+-diagram\.png$/);
    });

    it('should set correct Bucket, ContentType, and Body in PutObjectCommand', async () => {
      const file = {
        name: 'diagram.pdf',
        size: 2048,
        type: 'application/pdf',
        buffer: Buffer.from('PDF-data'),
      };

      await adapter.upload(file);

      const [commandArg] = MockPutObjectCommand.mock.calls[0];
      expect(commandArg.Bucket).toBe(BUCKET);
      expect(commandArg.ContentType).toBe('application/pdf');
      expect(commandArg.Body).toEqual(file.buffer);
    });

    it('should throw StorageError when S3 send fails', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'));
      const file = { name: 'arch.png', size: 512, type: 'image/png', buffer: Buffer.from('data') };

      await expect(adapter.upload(file)).rejects.toThrow(StorageError);
      await expect(adapter.upload(file)).rejects.toThrow('Failed to upload to S3');
    });

    it('should preserve original error as cause in StorageError', async () => {
      const originalError = new Error('NoSuchBucket');
      mockSend.mockRejectedValue(originalError);
      const file = { name: 'arch.png', size: 512, type: 'image/png', buffer: Buffer.from('data') };

      try {
        await adapter.upload(file);
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).cause).toBe(originalError);
      }
    });
  });
});
