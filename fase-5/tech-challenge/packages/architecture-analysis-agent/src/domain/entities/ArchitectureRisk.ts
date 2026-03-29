export type SeverityLevel = 'low' | 'medium' | 'high';

const VALID_SEVERITIES: SeverityLevel[] = ['low', 'medium', 'high'];

export interface ArchitectureRiskProps {
  title: string;
  description: string;
  severity: SeverityLevel;
  affectedComponents: string[];
}

export class ArchitectureRisk {
  readonly title: string;
  readonly description: string;
  readonly severity: SeverityLevel;
  readonly affectedComponents: string[];

  constructor(props: ArchitectureRiskProps) {
    if (!props.title || props.title.trim() === '') {
      throw new Error('title cannot be empty');
    }

    if (!VALID_SEVERITIES.includes(props.severity)) {
      throw new Error(`Invalid severity: "${props.severity}". Must be one of: ${VALID_SEVERITIES.join(', ')}`);
    }

    this.title = props.title.trim();
    this.description = props.description;
    this.severity = props.severity;
    this.affectedComponents = props.affectedComponents;
  }
}
