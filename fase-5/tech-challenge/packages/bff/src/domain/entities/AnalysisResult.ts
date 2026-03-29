export type ComponentType =
  | 'microservice'
  | 'database'
  | 'broker'
  | 'client'
  | 'unknown';

export type Severity = 'low' | 'medium' | 'high';
export type Priority = 'low' | 'medium' | 'high';

export interface Component {
  name: string;
  type: ComponentType;
  description: string;
}

export interface Risk {
  title: string;
  description: string;
  severity: Severity;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: Priority;
}

export interface AnalysisResultProps {
  components: Component[];
  risks: Risk[];
  recommendations: Recommendation[];
  summary: string;
}

export class AnalysisResult {
  readonly components: Component[];
  readonly risks: Risk[];
  readonly recommendations: Recommendation[];
  readonly summary: string;

  constructor(props: AnalysisResultProps) {
    this.components = props.components ?? [];
    this.risks = props.risks ?? [];
    this.recommendations = props.recommendations ?? [];
    this.summary = props.summary ?? '';
  }

  toJSON(): AnalysisResultProps {
    return {
      components: this.components,
      risks: this.risks,
      recommendations: this.recommendations,
      summary: this.summary,
    };
  }
}
