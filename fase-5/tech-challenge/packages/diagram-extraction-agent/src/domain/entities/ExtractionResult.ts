import { DiagramElement } from './DiagramElement';

export type ExtractionStatus = 'processed' | 'failed';
export type ConnectionType = 'sync' | 'async' | 'unknown';

export interface ElementConnection {
  fromElementId: string;
  toElementId: string;
  type: ConnectionType;
  label?: string;
}

export interface ExtractionError {
  code: string;
  message: string;
}

export interface ExtractionResultProps {
  diagramId: string;
  extractedText: string;
  elements: DiagramElement[];
  connections: ElementConnection[];
  error?: ExtractionError;
}

export class ExtractionResult {
  readonly diagramId: string;
  readonly status: ExtractionStatus;
  readonly extractedText: string;
  readonly elements: DiagramElement[];
  readonly connections: ElementConnection[];
  readonly error?: ExtractionError;

  constructor(props: ExtractionResultProps) {
    this.diagramId = props.diagramId;
    this.extractedText = props.extractedText;
    this.elements = props.elements;
    this.connections = props.connections;
    this.error = props.error;
    this.status = props.error ? 'failed' : 'processed';
  }
}
