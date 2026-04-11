import { Analysis } from '../entities/Analysis';

export interface IAnalysisRepository {
  save(analysis: Analysis): Promise<void>;
  findById(id: string): Promise<Analysis | null>;
  findByDiagramId(diagramId: string): Promise<Analysis | null>;
  update(analysis: Analysis): Promise<void>;
}
