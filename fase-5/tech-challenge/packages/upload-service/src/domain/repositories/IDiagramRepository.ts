import { Diagram } from '../entities/Diagram';

export interface IDiagramRepository {
  save(diagram: Diagram): Promise<Diagram>;
  findById(id: string): Promise<Diagram | null>;
}
