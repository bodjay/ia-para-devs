import { ArchitectureAnalysis } from '../../domain/entities/ArchitectureAnalysis';

export class ReportServiceClient {
  constructor(
    private readonly baseUrl: string = process.env.REPORT_SERVICE_URL ?? 'http://localhost:3002'
  ) {}

  async storeReport(analysis: ArchitectureAnalysis): Promise<void> {
    const payload = {
      eventId: analysis.analysisId,
      timestamp: new Date().toISOString(),
      analysisId: analysis.analysisId,
      diagramId: analysis.diagramId,
      status: analysis.status,
      ...(analysis.status === 'completed' && {
        result: {
          components: analysis.components,
          risks: analysis.risks.map((r) => ({
            title: r.title,
            description: r.description,
            severity: r.severity,
            affectedComponents: r.affectedComponents,
          })),
          recommendations: analysis.recommendations.map((rec) => ({
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            relatedRisks: rec.relatedRisks,
          })),
          summary: analysis.summary,
        },
      }),
      ...(analysis.error && { error: analysis.error }),
    };

    const res = await fetch(`${this.baseUrl}/tools/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`store_report tool failed with status ${res.status}`);
    }
  }
}
