import { ArchitectureAnalysis } from '../entities/ArchitectureAnalysis';
import { ComponentType } from '../entities/ArchitectureAnalysis';

export type AnalysisDepth = 'basic' | 'intermediate' | 'deep';
export type ConnectionType = 'sync' | 'async' | 'unknown';

export interface AnalysisElement {
  id: string;
  label: string;
  type: ComponentType;
}

export interface AnalysisConnection {
  fromElementId: string;
  toElementId: string;
  type: ConnectionType;
}

export interface AnalyzeArchitectureInput {
  action: 'analyze';
  payload: {
    diagramId: string;
    elements: AnalysisElement[];
    connections: AnalysisConnection[];
    options?: {
      analysisDepth?: AnalysisDepth;
      includeRisks?: boolean;
      includeRecommendations?: boolean;
      language?: string;
    };
  };
}

export interface IAnalyzeArchitectureUseCase {
  execute(input: AnalyzeArchitectureInput): Promise<ArchitectureAnalysis>;
}
