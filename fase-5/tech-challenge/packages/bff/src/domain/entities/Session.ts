export interface SessionProps {
  sessionId: string;
  name: string;
  createdAt: Date;
  lastActiveAt: Date;
  diagramId?: string;
  analysisId?: string;
}

export class Session {
  readonly sessionId: string;
  private _name: string;
  readonly createdAt: Date;
  private _lastActiveAt: Date;
  private _diagramId?: string;
  private _analysisId?: string;

  constructor(props: SessionProps) {
    if (!props.sessionId || props.sessionId.trim() === '') {
      throw new Error('sessionId is required');
    }
    if (!props.name || props.name.trim() === '') {
      throw new Error('Session name is required');
    }

    this.sessionId = props.sessionId;
    this._name = props.name.trim();
    this.createdAt = props.createdAt;
    this._lastActiveAt = props.lastActiveAt;
    this._diagramId = props.diagramId;
    this._analysisId = props.analysisId;
  }

  get name(): string {
    return this._name;
  }

  get lastActiveAt(): Date {
    return this._lastActiveAt;
  }

  get diagramId(): string | undefined {
    return this._diagramId;
  }

  get analysisId(): string | undefined {
    return this._analysisId;
  }

  touch(): void {
    this._lastActiveAt = new Date();
  }

  linkDiagram(diagramId: string, analysisId: string): void {
    this._diagramId = diagramId;
    this._analysisId = analysisId;
    this.touch();
  }

  toJSON(): SessionProps {
    return {
      sessionId: this.sessionId,
      name: this._name,
      createdAt: this.createdAt,
      lastActiveAt: this._lastActiveAt,
      diagramId: this._diagramId,
      analysisId: this._analysisId,
    };
  }
}
