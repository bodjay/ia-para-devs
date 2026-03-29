import { ComponentType } from '../entities/Report';

export type AnalysisDepth = 'basic' | 'intermediate' | 'deep';
export type ConnectionType = 'sync' | 'async' | 'unknown';

export interface DiagramElement {
  id: string;
  label: string;
  type: ComponentType;
  position?: { x: number; y: number };
}

export interface DiagramConnection {
  fromElementId: string;
  toElementId: string;
  type: ConnectionType;
}

export interface GenerateReportInput {
  diagramId: string;
  fileName: string;
  fileType: string;
  storageUrl: string;
  extractedText: string;
  elements: DiagramElement[];
  connections?: DiagramConnection[];
  options?: {
    analysisDepth?: AnalysisDepth;
    includeRisks?: boolean;
    includeRecommendations?: boolean;
    language?: string;
  };
}

export interface GenerateReportOutput {
  reportId: string;
  analysisId: string;
  diagramId: string;
  status: 'completed' | 'failed';
}

export interface IGenerateReportUseCase {
  execute(input: GenerateReportInput): Promise<GenerateReportOutput>;
}
