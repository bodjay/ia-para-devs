import { v4 as uuidv4 } from 'uuid';
import { Report } from '../../domain/entities/Report';
import { IReportRepository } from '../../domain/repositories/IReportRepository';
import {
  IGenerateReportUseCase,
  GenerateReportInput,
  GenerateReportOutput,
} from '../../domain/use-cases/IGenerateReportUseCase';
import { IArchitectureAnalysisAgentClient } from '../ports/IArchitectureAnalysisAgentClient';
import { IAnalysisCompletedProducer } from '../ports/IAnalysisCompletedProducer';

export class GenerateReportUseCase implements IGenerateReportUseCase {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly analysisAgent: IArchitectureAnalysisAgentClient,
    private readonly eventProducer: IAnalysisCompletedProducer
  ) {}

  async execute(input: GenerateReportInput): Promise<GenerateReportOutput> {
    const report = new Report({
      diagramId: input.diagramId,
    });

    await this.reportRepository.save(report);
    report.startProcessing();
    await this.reportRepository.update(report);

    try {
      const agentResponse = await this.analysisAgent.analyze({
        diagramId: input.diagramId,
        elements: input.elements.map((el) => ({
          id: el.id,
          label: el.label,
          type: el.type,
        })),
        connections: input.connections ?? [],
        options: {
          analysisDepth: input.options?.analysisDepth ?? 'intermediate',
          includeRisks: input.options?.includeRisks ?? true,
          includeRecommendations: input.options?.includeRecommendations ?? true,
          language: input.options?.language ?? 'pt-BR',
        },
      });

      if (agentResponse.status === 'failed') {
        report.fail({
          code: agentResponse.error?.code ?? 'ANALYSIS_FAILED',
          message: agentResponse.error?.message ?? 'Architecture analysis failed',
        });
        await this.reportRepository.update(report);

        await this.eventProducer.publishAnalysisCompleted({
          eventId: uuidv4(),
          timestamp: new Date().toISOString(),
          analysisId: agentResponse.analysisId,
          diagramId: input.diagramId,
          status: 'failed',
          error: report.error,
        });

        return {
          reportId: report.id,
          analysisId: agentResponse.analysisId,
          diagramId: input.diagramId,
          status: 'failed',
        };
      }

      report.complete({
        analysisId: agentResponse.analysisId,
        components: agentResponse.components.map((c) => ({
          name: c.name,
          type: c.type,
          description: c.description,
          observations: c.observations,
        })),
        risks: agentResponse.risks.map((r) => ({
          title: r.title,
          description: r.description,
          severity: r.severity,
          affectedComponents: r.affectedComponents,
        })),
        recommendations: agentResponse.recommendations.map((rec) => ({
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          relatedRisks: rec.relatedRisks,
        })),
        summary: agentResponse.summary,
        patterns: agentResponse.architecturePatterns,
      });

      await this.reportRepository.update(report);

      await this.eventProducer.publishAnalysisCompleted({
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        analysisId: agentResponse.analysisId,
        diagramId: input.diagramId,
        status: 'completed',
        result: {
          components: report.components,
          risks: report.risks,
          recommendations: report.recommendations,
          summary: report.summary,
        },
      });

      return {
        reportId: report.id,
        analysisId: agentResponse.analysisId,
        diagramId: input.diagramId,
        status: 'completed',
      };
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unexpected error during analysis';
      report.fail({ code: 'INTERNAL_ERROR', message: errorMessage });
      await this.reportRepository.update(report);

      await this.eventProducer.publishAnalysisCompleted({
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        analysisId: report.analysisId,
        diagramId: input.diagramId,
        status: 'failed',
        error: report.error,
      });

      return {
        reportId: report.id,
        analysisId: report.analysisId,
        diagramId: input.diagramId,
        status: 'failed',
      };
    }
  }
}
