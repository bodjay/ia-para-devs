import { v4 as uuidv4 } from 'uuid';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ComponentType = 'microservice' | 'database' | 'broker' | 'client' | 'unknown';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface ReportComponent {
  name: string;
  type: ComponentType;
  description: string;
  observations?: string;
}

export interface ReportRisk {
  title: string;
  description: string;
  severity: SeverityLevel;
  affectedComponents: string[];
}

export interface ReportRecommendation {
  title: string;
  description: string;
  priority: PriorityLevel;
  relatedRisks: string[];
}

export interface ArchitecturePattern {
  name: string;
  confidence: number;
  description: string;
}

export interface ReportError {
  code: string;
  message: string;
}

export interface ReportProps {
  id?: string;
  analysisId?: string;
  diagramId: string;
  status?: ReportStatus;
  components?: ReportComponent[];
  risks?: ReportRisk[];
  recommendations?: ReportRecommendation[];
  summary?: string;
  patterns?: ArchitecturePattern[];
  createdAt?: Date;
  completedAt?: Date;
  error?: ReportError;
}

export class Report {
  readonly id: string;
  analysisId: string;
  readonly diagramId: string;
  status: ReportStatus;
  components: ReportComponent[];
  risks: ReportRisk[];
  recommendations: ReportRecommendation[];
  summary: string;
  patterns: ArchitecturePattern[];
  readonly createdAt: Date;
  completedAt?: Date;
  error?: ReportError;

  constructor(props: ReportProps) {
    if (!props.diagramId || props.diagramId.trim() === '') {
      throw new Error('diagramId cannot be empty');
    }

    this.id = props.id ?? uuidv4();
    this.analysisId = props.analysisId ?? uuidv4();
    this.diagramId = props.diagramId.trim();
    this.status = props.status ?? 'pending';
    this.components = props.components ?? [];
    this.risks = props.risks ?? [];
    this.recommendations = props.recommendations ?? [];
    this.summary = props.summary ?? '';
    this.patterns = props.patterns ?? [];
    this.createdAt = props.createdAt ?? new Date();
    this.completedAt = props.completedAt;
    this.error = props.error;
  }

  startProcessing(): void {
    this.status = 'processing';
  }

  complete(result: {
    analysisId: string;
    components: ReportComponent[];
    risks: ReportRisk[];
    recommendations: ReportRecommendation[];
    summary: string;
    patterns: ArchitecturePattern[];
  }): void {
    this.status = 'completed';
    this.analysisId = result.analysisId;
    this.components = result.components;
    this.risks = result.risks;
    this.recommendations = result.recommendations;
    this.summary = result.summary;
    this.patterns = result.patterns;
    this.completedAt = new Date();
  }

  fail(error: ReportError): void {
    this.status = 'failed';
    this.error = error;
    this.completedAt = new Date();
  }
}
