import { DiagramElement } from '../../domain/entities/DiagramElement';
import { ExtractionResult } from '../../domain/entities/ExtractionResult';
import { IExtractDiagramUseCase, ExtractDiagramInput } from '../../domain/use-cases/IExtractDiagramUseCase';
import { IVisionClient } from '../../infrastructure/ai/IVisionClient';
import { ProcessingServiceClient } from '../../infrastructure/tools/ProcessingServiceClient';

export class ExtractDiagramUseCase implements IExtractDiagramUseCase {
  constructor(
    private readonly visionClient: IVisionClient,
    private readonly processingClient: ProcessingServiceClient
  ) {}

  async execute(input: ExtractDiagramInput): Promise<ExtractionResult> {
    const { diagram } = input.payload;

    let jobId: string | null = null;
    try {
      jobId = await this.processingClient.createJob(diagram.id);
    } catch (err) {
      console.warn('[ExtractDiagramUseCase] Could not create processing job:', (err as Error).message);
    }

    try {
      const response = await this.visionClient.extractFromUrl(
        diagram.storageUrl,
        diagram.fileType,
        input.payload.extractedText
      );

      const elements = response.elements.map(
        (el) =>
          new DiagramElement({
            id: el.id,
            label: el.label,
            type: el.type,
            confidence: el.confidence,
            boundingBox: el.boundingBox,
          })
      );

      if (jobId) {
        await this.processingClient.updateJob(jobId, {
          status: 'processed',
          extractedText: response.extractedText,
          elements: response.elements,
          connections: response.connections,
        }).catch((err) =>
          console.warn('[ExtractDiagramUseCase] Could not update job:', (err as Error).message)
        );
      }

      return new ExtractionResult({
        diagramId: diagram.id,
        extractedText: response.extractedText,
        elements,
        connections: response.connections,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Unknown extraction error';
      const code = this.mapErrorCode(message);

      if (jobId) {
        await this.processingClient.updateJob(jobId, {
          status: 'failed',
          error: { code, message },
        }).catch((err) =>
          console.warn('[ExtractDiagramUseCase] Could not update failed job:', (err as Error).message)
        );
      }

      return new ExtractionResult({
        diagramId: diagram.id,
        extractedText: '',
        elements: [],
        connections: [],
        error: { code, message },
      });
    }
  }

  private mapErrorCode(message: string): string {
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('invalid') || message.includes('URL')) return 'INVALID_URL';
    if (message.includes('API')) return 'API_ERROR';
    return 'EXTRACTION_FAILED';
  }
}
