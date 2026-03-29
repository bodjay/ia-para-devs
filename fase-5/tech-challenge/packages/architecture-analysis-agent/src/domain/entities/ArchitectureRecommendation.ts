export type PriorityLevel = 'low' | 'medium' | 'high';

const VALID_PRIORITIES: PriorityLevel[] = ['low', 'medium', 'high'];

export interface ArchitectureRecommendationProps {
  title: string;
  description: string;
  priority: PriorityLevel;
  relatedRisks: string[];
}

export class ArchitectureRecommendation {
  readonly title: string;
  readonly description: string;
  readonly priority: PriorityLevel;
  readonly relatedRisks: string[];

  constructor(props: ArchitectureRecommendationProps) {
    if (!props.title || props.title.trim() === '') {
      throw new Error('title cannot be empty');
    }

    if (!VALID_PRIORITIES.includes(props.priority)) {
      throw new Error(`Invalid priority: "${props.priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    this.title = props.title.trim();
    this.description = props.description;
    this.priority = props.priority;
    this.relatedRisks = props.relatedRisks;
  }
}
