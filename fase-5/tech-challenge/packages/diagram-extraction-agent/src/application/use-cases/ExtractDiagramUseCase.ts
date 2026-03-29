import { DiagramElement } from '../../domain/entities/DiagramElement';
import { ExtractionResult } from '../../domain/entities/ExtractionResult';
import { IExtractDiagramUseCase, ExtractDiagramInput } from '../../domain/use-cases/IExtractDiagramUseCase';
import { ClaudeVisionClient } from '../../infrastructure/ai/ClaudeVisionClient';

export class ExtractDiagramUseCase implements IExtractDiagramUseCase {
  constructor(private readonly claudeVisionClient: ClaudeVisionClient) {}

  async execute(input: ExtractDiagramInput): Promise<ExtractionResult> {
    const { diagram } = input.payload;

    try {
      const claudeResponse = await this.claudeVisionClient.extractFromUrl(
        diagram.storageUrl,
        diagram.fileType
      );

      const elements = claudeResponse.elements.map(
        (el) =>
          new DiagramElement({
            id: el.id,
            label: el.label,
            type: el.type,
            confidence: el.confidence,
            boundingBox: el.boundingBox,
          })
      );

      return new ExtractionResult({
        diagramId: diagram.id,
        extractedText: claudeResponse.extractedText,
        elements,
        connections: claudeResponse.connections,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Unknown extraction error';
      const code = this.mapErrorCode(message);

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
