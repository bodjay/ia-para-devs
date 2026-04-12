import { DiagramFileType } from '../entities/Diagram';

export type AnalysisDepth = 'basic' | 'intermediate' | 'deep';

export interface CreateAnalysisInput {
  diagram: {
    id: string;
    fileName: string;
    fileType: DiagramFileType;
    fileSize: number;
    storageUrl: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  options?: {
    language?: string;
    analysisDepth?: AnalysisDepth;
    includeRecommendations?: boolean;
    includeRisks?: boolean;
  };
}

export interface CreateAnalysisOutput {
  analysisId: string;
  status: 'created';
  createdAt: string;
  estimatedCompletionSeconds: number;
}

export interface ICreateAnalysisUseCase {
  execute(input: CreateAnalysisInput): Promise<CreateAnalysisOutput>;
}
