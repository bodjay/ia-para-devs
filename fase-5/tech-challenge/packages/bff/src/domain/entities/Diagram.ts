export type DiagramFileType = 'image/png' | 'image/jpeg' | 'application/pdf';

export const SUPPORTED_FILE_TYPES: DiagramFileType[] = [
  'image/png',
  'image/jpeg',
  'application/pdf',
];

export interface DiagramProps {
  id: string;
  fileName: string;
  fileType: DiagramFileType;
  fileSize: number;
  storageUrl: string;
}

export class Diagram {
  readonly id: string;
  readonly fileName: string;
  readonly fileType: DiagramFileType;
  readonly fileSize: number;
  readonly storageUrl: string;

  constructor(props: DiagramProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('Diagram id is required');
    }
    if (!props.fileName || props.fileName.trim() === '') {
      throw new Error('Diagram fileName is required');
    }
    if (!SUPPORTED_FILE_TYPES.includes(props.fileType)) {
      throw new Error(
        `Unsupported fileType: ${props.fileType}. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
      );
    }
    if (!props.storageUrl || props.storageUrl.trim() === '') {
      throw new Error('Diagram storageUrl is required');
    }

    this.id = props.id;
    this.fileName = props.fileName;
    this.fileType = props.fileType;
    this.fileSize = props.fileSize;
    this.storageUrl = props.storageUrl;
  }

  toJSON(): DiagramProps {
    return {
      id: this.id,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      storageUrl: this.storageUrl,
    };
  }
}
