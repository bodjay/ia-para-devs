import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { IStorageAdapter, StorageFile, StorageError } from './IStorageAdapter';

export class S3StorageAdapter implements IStorageAdapter {
  private readonly client: S3Client;
  private readonly region: string;

  constructor(
    private readonly bucketName: string,
    region: string = process.env.AWS_REGION ?? 'us-east-1'
  ) {
    this.region = region;
    this.client = new S3Client({ region: this.region });
  }

  async upload(file: StorageFile): Promise<string> {
    const key = `${Date.now()}-${file.name}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.type,
        })
      );
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      throw new StorageError(
        `Failed to upload to S3: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
