import { ReportComponent, ReportRisk, ReportRecommendation, ReportError } from '../../domain/entities/Report';

export interface AnalysisCompletedEvent {
  eventId: string;
  timestamp: string;
  analysisId: string;
  diagramId: string;
  status: 'completed' | 'failed';
  result?: {
    components: ReportComponent[];
    risks: ReportRisk[];
    recommendations: ReportRecommendation[];
    summary: string;
  };
  error?: ReportError;
}

export interface IAnalysisCompletedProducer {
  publishAnalysisCompleted(event: AnalysisCompletedEvent): Promise<void>;
}
