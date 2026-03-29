import { AnalysisResult } from './AnalysisResult';
import { Diagram } from './Diagram';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const VALID_STATUSES: AnalysisStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
];

const VALID_TRANSITIONS: Record<AnalysisStatus, AnalysisStatus[]> = {
  pending: ['processing', 'failed'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export interface AnalysisError {
  code: string;
  message: string;
}

export interface AnalysisProps {
  analysisId: string;
  status: AnalysisStatus;
  createdAt: Date;
  completedAt?: Date;
  diagram: Diagram;
  result?: AnalysisResult;
  error?: AnalysisError;
}

export class Analysis {
  readonly analysisId: string;
  private _status: AnalysisStatus;
  readonly createdAt: Date;
  private _completedAt?: Date;
  readonly diagram: Diagram;
  private _result?: AnalysisResult;
  private _error?: AnalysisError;

  constructor(props: AnalysisProps) {
    if (!props.analysisId || props.analysisId.trim() === '') {
      throw new Error('analysisId is required');
    }
    if (!VALID_STATUSES.includes(props.status)) {
      throw new Error(
        `Invalid status: ${props.status}. Valid statuses: ${VALID_STATUSES.join(', ')}`
      );
    }

    this.analysisId = props.analysisId;
    this._status = props.status;
    this.createdAt = props.createdAt;
    this._completedAt = props.completedAt;
    this.diagram = props.diagram;
    this._result = props.result;
    this._error = props.error;
  }

  get status(): AnalysisStatus {
    return this._status;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get result(): AnalysisResult | undefined {
    return this._result;
  }

  get error(): AnalysisError | undefined {
    return this._error;
  }

  transitionTo(newStatus: AnalysisStatus): void {
    const allowed = VALID_TRANSITIONS[this._status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from "${this._status}" to "${newStatus}"`
      );
    }
    this._status = newStatus;
  }

  complete(result: AnalysisResult): void {
    this.transitionTo('completed');
    this._result = result;
    this._completedAt = new Date();
  }

  fail(error: AnalysisError): void {
    this.transitionTo('failed');
    this._error = error;
    this._completedAt = new Date();
  }

  startProcessing(): void {
    this.transitionTo('processing');
  }

  toJSON(): AnalysisProps {
    return {
      analysisId: this.analysisId,
      status: this._status,
      createdAt: this.createdAt,
      completedAt: this._completedAt,
      diagram: this.diagram,
      result: this._result,
      error: this._error,
    };
  }
}
