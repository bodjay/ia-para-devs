import { ExtractionResult } from '../entities/ExtractionResult';

export type SupportedFileType = 'image/png' | 'image/jpeg' | 'application/pdf';

export interface ExtractDiagramInput {
  action: 'extract';
  payload: {
    diagram: {
      id: string;
      fileType: SupportedFileType;
      storageUrl: string;
    };
    userId?: string;
    extractedText?: string;
    options?: {
      detectText?: boolean;
      detectShapes?: boolean;
      detectConnections?: boolean;
      language?: string;
    };
  };
}

export interface IExtractDiagramUseCase {
  execute(input: ExtractDiagramInput): Promise<ExtractionResult>;
}
