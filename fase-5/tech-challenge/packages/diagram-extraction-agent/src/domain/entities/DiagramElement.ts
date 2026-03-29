import { v4 as uuidv4 } from 'uuid';

export type ElementType = 'microservice' | 'database' | 'broker' | 'client' | 'unknown';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramElementProps {
  id?: string;
  label: string;
  type: ElementType;
  confidence: number;
  boundingBox: BoundingBox;
}

export class DiagramElement {
  readonly id: string;
  readonly label: string;
  readonly type: ElementType;
  readonly confidence: number;
  readonly boundingBox: BoundingBox;

  constructor(props: DiagramElementProps) {
    if (!props.label || props.label.trim() === '') {
      throw new Error('label cannot be empty');
    }

    if (props.confidence < 0 || props.confidence > 1) {
      throw new Error('confidence must be between 0.0 and 1.0');
    }

    this.id = props.id ?? uuidv4();
    this.label = props.label.trim();
    this.type = props.type;
    this.confidence = props.confidence;
    this.boundingBox = props.boundingBox;
  }
}
