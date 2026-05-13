import { IVectorRepository, SearchResult } from '../../domain/repositories/IVectorRepository';

export interface SearchReportsOutput {
  results: SearchResult[];
}

export class SearchReportsUseCase {
  constructor(private readonly repository: IVectorRepository) {}

  async execute(query: string, limit: number = 5): Promise<SearchReportsOutput> {
    const results = await this.repository.search(query, Math.min(limit, 20));
    return { results };
  }
}
