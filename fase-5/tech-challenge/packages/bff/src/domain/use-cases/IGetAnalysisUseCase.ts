import { AnalysisStatus } from '../entities/Analysis';
import { Component, Recommendation, Risk } from '../entities/AnalysisResult';
import { DiagramFileType } from '../entities/Diagram';

export interface GetAnalysisOutput {
  analysisId: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt?: string;
  diagram: {
    id: string;
    fileName: string;
    fileType: DiagramFileType;
    storageUrl: string;
  };
  result?: {
    components: Component[];
    risks: Risk[];
    recommendations: Recommendation[];
    summary: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface IGetAnalysisUseCase {
  execute(analysisId: string): Promise<GetAnalysisOutput>;
}
