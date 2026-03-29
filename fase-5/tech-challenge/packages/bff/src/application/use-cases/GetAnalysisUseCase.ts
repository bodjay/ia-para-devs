import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import {
  GetAnalysisOutput,
  IGetAnalysisUseCase,
} from '../../domain/use-cases/IGetAnalysisUseCase';

export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}

export class GetAnalysisUseCase implements IGetAnalysisUseCase {
  constructor(private readonly repository: IAnalysisRepository) {}

  async execute(analysisId: string): Promise<GetAnalysisOutput> {
    const analysis = await this.repository.findById(analysisId);

    if (!analysis) {
      throw new NotFoundException(
        `Analysis with id "${analysisId}" not found`
      );
    }

    const output: GetAnalysisOutput = {
      analysisId: analysis.analysisId,
      status: analysis.status,
      createdAt: analysis.createdAt.toISOString(),
      diagram: {
        id: analysis.diagram.id,
        fileName: analysis.diagram.fileName,
        fileType: analysis.diagram.fileType,
        storageUrl: analysis.diagram.storageUrl,
      },
    };

    if (analysis.completedAt) {
      output.completedAt = analysis.completedAt.toISOString();
    }

    if (analysis.result) {
      output.result = {
        components: analysis.result.components,
        risks: analysis.result.risks,
        recommendations: analysis.result.recommendations,
        summary: analysis.result.summary,
      };
    }

    if (analysis.error) {
      output.error = {
        code: analysis.error.code,
        message: analysis.error.message,
      };
    }

    return output;
  }
}
