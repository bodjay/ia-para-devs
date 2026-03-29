import { v4 as uuidv4 } from 'uuid';

export type ProcessingStatus = 'pending' | 'processing' | 'processed' | 'failed';

export type ElementType = 'microservice' | 'database' | 'broker' | 'client' | 'unknown';

export interface DiagramElement {
  type: ElementType;
  label: string;
  position: { x: number; y: number };
}

export interface ProcessingError {
  code: string;
  message: string;
}

export interface ProcessingJobProps {
  id?: string;
  diagramId: string;
  status?: ProcessingStatus;
  extractedText?: string;
  elements?: DiagramElement[];
  error?: ProcessingError;
  createdAt?: Date;
}

export class ProcessingJob {
  readonly id: string;
  readonly diagramId: string;
  private _status: ProcessingStatus;
  private _extractedText: string;
  private _elements: DiagramElement[];
  private _error: ProcessingError | undefined;
  readonly createdAt: Date;

  constructor(props: ProcessingJobProps) {
    if (!props.diagramId || props.diagramId.trim() === '') {
      throw new Error('diagramId cannot be empty');
    }

    this.id = props.id ?? uuidv4();
    this.diagramId = props.diagramId.trim();
    this._status = props.status ?? 'pending';
    this._extractedText = props.extractedText ?? '';
    this._elements = props.elements ?? [];
    this._error = props.error;
    this.createdAt = props.createdAt ?? new Date();
  }

  get status(): ProcessingStatus {
    return this._status;
  }

  get extractedText(): string {
    return this._extractedText;
  }

  get elements(): DiagramElement[] {
    return [...this._elements];
  }

  get error(): ProcessingError | undefined {
    return this._error;
  }

  start(): void {
    this._status = 'processing';
  }

  complete(extractedText: string, elements: DiagramElement[]): void {
    this._status = 'processed';
    this._extractedText = extractedText;
    this._elements = elements;
  }

  fail(error: ProcessingError): void {
    this._status = 'failed';
    this._error = error;
  }
}
