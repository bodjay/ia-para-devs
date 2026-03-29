export type AnalysisStatus = 'idle' | 'uploading' | 'processing' | 'responding' | 'completed' | 'error';
export type RiskSeverity = 'low' | 'medium' | 'high';
export type RecommendationPriority = 'low' | 'medium' | 'high';

export interface AnalysisComponent {
  name: string;
  type: string;
  description?: string;
  dependencies?: string[];
}

export interface AnalysisRisk {
  description: string;
  severity: RiskSeverity;
  affectedComponents?: string[];
}

export interface AnalysisRecommendation {
  description: string;
  priority: RecommendationPriority;
  relatedComponents?: string[];
}

export interface AnalysisResult {
  components: AnalysisComponent[];
  risks: AnalysisRisk[];
  recommendations: AnalysisRecommendation[];
  summary: string;
  patterns?: string[];
}

export interface AnalysisProps {
  analysisId?: string;
  status: AnalysisStatus;
  diagramId?: string;
  result?: AnalysisResult;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class Analysis {
  readonly analysisId: string;
  readonly status: AnalysisStatus;
  readonly diagramId?: string;
  readonly result?: AnalysisResult;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: AnalysisProps) {
    this.analysisId = props.analysisId ?? crypto.randomUUID();
    this.status = props.status;
    this.diagramId = props.diagramId;
    this.result = props.result;
    this.errorMessage = props.errorMessage;
    this.createdAt = props.createdAt ?? new Date().toISOString();
    this.updatedAt = props.updatedAt ?? new Date().toISOString();
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  hasError(): boolean {
    return this.status === 'error';
  }

  toPlainObject(): AnalysisProps & { analysisId: string } {
    return {
      analysisId: this.analysisId,
      status: this.status,
      diagramId: this.diagramId,
      result: this.result,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
