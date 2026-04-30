import { Request, Response } from 'express';
import { ITextractAdapter } from '../textract/TextractAdapter';

export class OcrToolController {
  constructor(private readonly textractAdapter: ITextractAdapter) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { s3Url } = req.body as { s3Url?: string };
    if (!s3Url) {
      res.status(400).json({ error: 's3Url is required' });
      return;
    }

    try {
      const extractedText = await this.textractAdapter.extractText(s3Url);
      res.json({ extractedText });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
