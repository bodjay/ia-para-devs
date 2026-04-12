import { ElementType } from '../../domain/entities/DiagramElement';
import { ConnectionType } from '../../domain/entities/ExtractionResult';

export interface VisionExtractionResponse {
  extractedText: string;
  elements: Array<{
    id: string;
    label: string;
    type: ElementType;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  connections: Array<{
    fromElementId: string;
    toElementId: string;
    type: ConnectionType;
    label?: string;
  }>;
}

export interface IVisionClient {
  extractFromUrl(
    storageUrl: string,
    fileType: string,
    extractedText?: string
  ): Promise<VisionExtractionResponse>;
}
