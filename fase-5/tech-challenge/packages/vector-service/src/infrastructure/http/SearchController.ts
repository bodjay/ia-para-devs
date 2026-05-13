import { Request, Response } from 'express';
import { SearchReportsUseCase } from '../../application/use-cases/SearchReportsUseCase';

export class SearchController {
  constructor(private readonly searchUseCase: SearchReportsUseCase) {}

  async search(req: Request, res: Response): Promise<void> {
    const q = req.query['q'];
    const limit = parseInt((req.query['limit'] as string) ?? '5', 10);

    if (typeof q !== 'string' || q.trim() === '') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    try {
      const output = await this.searchUseCase.execute(q.trim(), limit);
      res.json(output);
    } catch (err) {
      console.error('[SearchController] Search failed:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
