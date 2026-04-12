import { v4 as uuidv4 } from 'uuid';
import { ArchitectureRisk } from './ArchitectureRisk';
import { ArchitectureRecommendation } from './ArchitectureRecommendation';

export type AnalysisStatus = 'completed' | 'failed';
export type ComponentType = 'microservice' | 'database' | 'broker' | 'client' | 'unknown';

export interface AnalysisComponent {
  name: string;
  type: ComponentType;
  description: string;
  observations: string;
}

export interface ArchitecturePattern {
  name: string;
  confidence: number;
  description: string;
}

export interface AnalysisError {
  code: string;
  message: string;
}

export interface ArchitectureAnalysisProps {
  analysisId?: string;
  diagramId: string;
  status: AnalysisStatus;
  components: AnalysisComponent[];
  architecturePatterns: ArchitecturePattern[];
  risks: ArchitectureRisk[];
  recommendations: ArchitectureRecommendation[];
  summary: string;
  error?: AnalysisError;
}

export class ArchitectureAnalysis {
  readonly analysisId: string;
  readonly diagramId: string;
  readonly status: AnalysisStatus;
  readonly components: AnalysisComponent[];
  readonly architecturePatterns: ArchitecturePattern[];
  readonly risks: ArchitectureRisk[];
  readonly recommendations: ArchitectureRecommendation[];
  readonly summary: string;
  readonly error?: AnalysisError;

  constructor(props: ArchitectureAnalysisProps) {
    this.analysisId = props.analysisId ?? uuidv4();
    this.diagramId = props.diagramId;
    this.status = props.status;
    this.components = props.components;
    this.architecturePatterns = props.architecturePatterns;
    this.risks = props.risks;
    this.recommendations = props.recommendations;
    this.summary = props.summary;
    this.error = props.error;
  }
}
