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
    console.log(`[TextractAdapter] Iniciando extração | bucket=${bucket} key=${key} featureTypes=LAYOUT`);

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

    const blocks = response.Blocks ?? [];
    console.log(`[TextractAdapter] Resposta recebida | totalBlocks=${blocks.length}`);

    if (blocks.length === 0) {
      console.warn('[TextractAdapter] Nenhum bloco retornado pelo Textract');
      return '';
    }

    const blocksByType = blocks.reduce<Record<string, number>>((acc, b) => {
      const t = b.BlockType ?? 'UNKNOWN';
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});

    const { LINE = 0, WORD = 0, TABLE = 0, CELL = 0, PAGE = 0, ...rest } = blocksByType;
    const outros = Object.values(rest).reduce((s, n) => s + n, 0);
    console.log(`[TextractAdapter] Blocos por tipo | LINE=${LINE} WORD=${WORD} TABLE=${TABLE} CELL=${CELL} PAGE=${PAGE} outros=${outros}`);

    const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE');
    const lineText = lineBlocks.map((b) => b.Text ?? '').join('\n');
    const validConfidences = lineBlocks.map((b) => b.Confidence ?? 0).filter((c) => c > 0);
    const avgConfidence =
      validConfidences.length > 0
        ? (validConfidences.reduce((s, c) => s + c, 0) / validConfidences.length).toFixed(1)
        : 'N/A';

    console.log(`[TextractAdapter] Texto extraído | linhas=${lineBlocks.length} chars=${lineText.length} confiancaMedia=${avgConfidence}%`);
    console.log(`[TextractAdapter] Tabelas detectadas | tabelas=${TABLE}`);

    if (lineText.length > 0) {
      console.log(`[TextractAdapter] Amostra | "${lineText.slice(0, 200)}"`);
    }

    return lineText;
  }

  private parseS3Url(storageUrl: string): { bucket: string; key: string } {
    const url = new URL(storageUrl);
    const bucket = url.hostname.split('.')[0];
    const key = decodeURIComponent(url.pathname.slice(1));
    return { bucket, key };
  }
}
