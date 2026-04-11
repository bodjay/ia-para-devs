import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

export interface ITextractAdapter {
  extractText(storageUrl: string): Promise<string>;
}

export class TextractAdapter implements ITextractAdapter {
  private readonly client: TextractClient;

  constructor(private readonly region: string = process.env.AWS_REGION ?? 'us-east-1') {
    this.client = new TextractClient({ region: this.region });
  }

  async extractText(storageUrl: string): Promise<string> {
    const { bucket, key } = this.parseS3Url(storageUrl);

    const response = await this.client.send(
      new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
      })
    );

    const lines = (response.Blocks ?? [])
      .filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text ?? '')
      .filter(Boolean);

    return lines.join('\n');
  }

  private parseS3Url(storageUrl: string): { bucket: string; key: string } {
    const url = new URL(storageUrl);
    const bucket = url.hostname.split('.')[0];
    const key = decodeURIComponent(url.pathname.slice(1));
    return { bucket, key };
  }
}
