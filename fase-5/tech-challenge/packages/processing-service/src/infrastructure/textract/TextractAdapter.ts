import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

export interface ITextractAdapter {
  extractText(storageUrl: string): Promise<string>;
}

export class TextractAdapter implements ITextractAdapter {
  private readonly client: TextractClient;

  constructor(private readonly region: string = process.env.AWS_REGION ?? 'us-east-1') {
    this.client = new TextractClient({ region: this.region });
  }

  async extractText(storageUrl: string): Promise<string> {
    if (!storageUrl.startsWith('s3://') && !storageUrl.includes('.s3.')) {
      return '';
    }

    const { bucket, key } = this.parseS3Url(storageUrl);

    const response = await this.client.send(
      new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        FeatureTypes: ['LAYOUT'],
      })
    );
    console.log('Textract found blocks:', response.Blocks?.length ?? 0);

    if (response.Blocks?.length === 0) {
      console.warn('Textract did not return any blocks for the document');
      return '';
    }

    return JSON.stringify(response);
  }

  private parseS3Url(storageUrl: string): { bucket: string; key: string } {
    const url = new URL(storageUrl);
    const bucket = url.hostname.split('.')[0];
    const key = decodeURIComponent(url.pathname.slice(1));
    return { bucket, key };
  }
}
