export interface VectorizationInput {
  diagramId: string;
  analysisId: string;
  summary: string;
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
}
