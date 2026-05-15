import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@arch-analyzer/common';
import { ArchitectureAnalysis } from '../../domain/entities/ArchitectureAnalysis';
import { ArchitectureRisk } from '../../domain/entities/ArchitectureRisk';
import { ArchitectureRecommendation } from '../../domain/entities/ArchitectureRecommendation';
import {
  IAnalyzeArchitectureUseCase,
  AnalyzeArchitectureInput,
} from '../../domain/use-cases/IAnalyzeArchitectureUseCase';
import { IAnalysisClient } from '../../infrastructure/ai/IAnalysisClient';
import { ReportServiceClient } from '../../infrastructure/tools/ReportServiceClient';

const logger = new Logger('architecture-analysis-use-case');

export class AnalyzeArchitectureUseCase implements IAnalyzeArchitectureUseCase {
  constructor(
    private readonly analysisClient: IAnalysisClient,
    private readonly reportClient: ReportServiceClient
  ) {}

  async execute(input: AnalyzeArchitectureInput): Promise<ArchitectureAnalysis> {
    const { payload } = input;
    const options = {
      analysisDepth: payload.options?.analysisDepth ?? 'intermediate',
      includeRisks: payload.options?.includeRisks ?? true,
      includeRecommendations: payload.options?.includeRecommendations ?? true,
      language: payload.options?.language ?? 'pt-BR',
    } as const;

    const analysisId = uuidv4();
    logger.info('input received for architecture analysis', { payload, options });
    logger.info('starting architecture analysis', { analysisId, diagramId: payload.diagramId });

    let analysis: ArchitectureAnalysis;

    try {
      const response = await this.analysisClient.analyze(
        payload.elements,
        payload.connections,
        options,
        payload.extractedText
      );

      const risks = options.includeRisks
        ? response.risks.map(
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
        ? response.recommendations.map(
            (rec) =>
              new ArchitectureRecommendation({
                title: rec.title,
                description: rec.description,
                priority: rec.priority,
                relatedRisks: rec.relatedRisks,
              })
          )
        : [];

      analysis = new ArchitectureAnalysis({
        analysisId,
        diagramId: payload.diagramId,
        status: 'completed',
        components: response.components,
        architecturePatterns: response.architecturePatterns,
        risks,
        recommendations,
        summary: response.summary,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Unknown analysis error';
      logger.error('Analysis failed', { error: (error as Error).message, stack: (error as Error).stack });

      analysis = new ArchitectureAnalysis({
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

    await this.reportClient.storeReport(analysis).catch((err) =>
      logger.warn('Could not store report via tool', { error: (err as Error).message })
    );

    return analysis;
  }
}
