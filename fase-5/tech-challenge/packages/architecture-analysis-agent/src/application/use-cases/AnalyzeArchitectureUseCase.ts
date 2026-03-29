import { v4 as uuidv4 } from 'uuid';
import { ArchitectureAnalysis } from '../../domain/entities/ArchitectureAnalysis';
import { ArchitectureRisk } from '../../domain/entities/ArchitectureRisk';
import { ArchitectureRecommendation } from '../../domain/entities/ArchitectureRecommendation';
import {
  IAnalyzeArchitectureUseCase,
  AnalyzeArchitectureInput,
} from '../../domain/use-cases/IAnalyzeArchitectureUseCase';
import { ClaudeAnalysisClient } from '../../infrastructure/ai/ClaudeAnalysisClient';

export class AnalyzeArchitectureUseCase implements IAnalyzeArchitectureUseCase {
  constructor(private readonly claudeAnalysisClient: ClaudeAnalysisClient) {}

  async execute(input: AnalyzeArchitectureInput): Promise<ArchitectureAnalysis> {
    const { payload } = input;
    const options = {
      analysisDepth: payload.options?.analysisDepth ?? 'intermediate',
      includeRisks: payload.options?.includeRisks ?? true,
      includeRecommendations: payload.options?.includeRecommendations ?? true,
      language: payload.options?.language ?? 'pt-BR',
    } as const;

    const analysisId = uuidv4();

    try {
      const claudeResponse = await this.claudeAnalysisClient.analyze(
        payload.elements,
        payload.connections,
        options
      );

      const risks = options.includeRisks
        ? claudeResponse.risks.map(
            (r) =>
              new ArchitectureRisk({
                title: r.title,
                description: r.description,
                severity: r.severity,
                affectedComponents: r.affectedComponents,
              })
          )
        : [];

      const recommendations = options.includeRecommendations
        ? claudeResponse.recommendations.map(
            (rec) =>
              new ArchitectureRecommendation({
                title: rec.title,
                description: rec.description,
                priority: rec.priority,
                relatedRisks: rec.relatedRisks,
              })
          )
        : [];

      return new ArchitectureAnalysis({
        analysisId,
        diagramId: payload.diagramId,
        status: 'completed',
        components: claudeResponse.components,
        architecturePatterns: claudeResponse.architecturePatterns,
        risks,
        recommendations,
        summary: claudeResponse.summary,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Unknown analysis error';

      return new ArchitectureAnalysis({
        analysisId,
        diagramId: payload.diagramId,
        status: 'failed',
        components: [],
        architecturePatterns: [],
        risks: [],
        recommendations: [],
        summary: '',
        error: { code: 'ANALYSIS_ERROR', message },
      });
    }
  }
}
