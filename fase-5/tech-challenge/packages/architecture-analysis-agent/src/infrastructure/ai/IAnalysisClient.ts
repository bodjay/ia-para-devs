import { AnalysisComponent, ArchitecturePattern } from '../../domain/entities/ArchitectureAnalysis';
import { SeverityLevel } from '../../domain/entities/ArchitectureRisk';
import { PriorityLevel } from '../../domain/entities/ArchitectureRecommendation';
import { AnalysisElement, AnalysisConnection, AnalysisDepth } from '../../domain/use-cases/IAnalyzeArchitectureUseCase';

export interface AnalysisRisk {
  title: string;
  description: string;
  severity: SeverityLevel;
  affectedComponents: string[];
}

export interface AnalysisRecommendation {
  title: string;
  description: string;
  priority: PriorityLevel;
  relatedRisks: string[];
}

export interface AnalysisResponse {
  components: AnalysisComponent[];
  architecturePatterns: ArchitecturePattern[];
  risks: AnalysisRisk[];
  recommendations: AnalysisRecommendation[];
  summary: string;
}

export interface AnalysisOptions {
  analysisDepth: AnalysisDepth;
  includeRisks: boolean;
  includeRecommendations: boolean;
  language: string;
}

export interface IAnalysisClient {
  analyze(
    elements: AnalysisElement[],
    connections: AnalysisConnection[],
    options: AnalysisOptions
  ): Promise<AnalysisResponse>;
}
