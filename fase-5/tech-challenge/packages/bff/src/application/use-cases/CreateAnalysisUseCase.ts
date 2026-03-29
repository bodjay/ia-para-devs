import { randomUUID } from 'crypto';
import { Analysis } from '../../domain/entities/Analysis';
import { Diagram, SUPPORTED_FILE_TYPES } from '../../domain/entities/Diagram';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import {
  CreateAnalysisInput,
  CreateAnalysisOutput,
  ICreateAnalysisUseCase,
} from '../../domain/use-cases/ICreateAnalysisUseCase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ESTIMATED_SECONDS_BY_DEPTH: Record<string, number> = {
  basic: 30,
  intermediate: 60,
  deep: 120,
};

export class CreateAnalysisUseCase implements ICreateAnalysisUseCase {
  constructor(private readonly repository: IAnalysisRepository) {}

  async execute(input: CreateAnalysisInput): Promise<CreateAnalysisOutput> {
    this.validate(input);

    const diagram = new Diagram({
      id: input.diagram.id,
      fileName: input.diagram.fileName,
      fileType: input.diagram.fileType,
      fileSize: input.diagram.fileSize,
      storageUrl: input.diagram.storageUrl,
    });

    const analysisId = randomUUID();
    const createdAt = new Date();

    const analysis = new Analysis({
      analysisId,
      status: 'pending',
      createdAt,
      diagram,
    });

    await this.repository.save(analysis);

    const depth = input.options?.analysisDepth ?? 'basic';
    const estimatedCompletionSeconds =
      ESTIMATED_SECONDS_BY_DEPTH[depth] ?? ESTIMATED_SECONDS_BY_DEPTH.basic;

    return {
      analysisId,
      status: 'created',
      createdAt: createdAt.toISOString(),
      estimatedCompletionSeconds,
    };
  }

  private validate(input: CreateAnalysisInput): void {
    if (!input.diagram.id || input.diagram.id.trim() === '') {
      throw new Error('diagram.id is required');
    }

    if (!SUPPORTED_FILE_TYPES.includes(input.diagram.fileType)) {
      throw new Error(
        `Unsupported fileType: ${input.diagram.fileType}. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
      );
    }

    if (!input.user.id || input.user.id.trim() === '') {
      throw new Error('user.id is required');
    }

    if (!input.user.email || !EMAIL_REGEX.test(input.user.email)) {
      throw new Error('user.email is invalid');
    }
  }
}
