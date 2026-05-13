export interface AnalysisCompletedEvent {
  eventId: string;
  timestamp: string;
  analysisId: string;
  diagramId: string;
  status: 'completed' | 'failed';
  result?: {
    components: Array<{
      name: string;
      type: string;
      description: string;
      observations?: string;
    }>;
    risks: Array<{
      title: string;
      description: string;
      severity: string;
      affectedComponents: string[];
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: string;
      relatedRisks: string[];
    }>;
    summary: string;
  };
}
