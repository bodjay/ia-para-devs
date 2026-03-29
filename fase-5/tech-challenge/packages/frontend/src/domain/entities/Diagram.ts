export const SUPPORTED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'] as const;
export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface DiagramProps {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  previewUrl?: string;
}

export class Diagram {
  readonly id: string;
  readonly fileName: string;
  readonly fileType: SupportedFileType;
  readonly fileSize: number;
  readonly storageUrl: string;
  readonly previewUrl?: string;

  constructor(props: DiagramProps) {
    if (!props.fileName || props.fileName.trim() === '') {
      throw new Error('fileName cannot be empty');
    }

    if (!SUPPORTED_FILE_TYPES.includes(props.fileType as SupportedFileType)) {
      throw new Error(
        `Unsupported file type: ${props.fileType}. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
      );
    }

    if (!props.fileSize || props.fileSize <= 0) {
      throw new Error('fileSize must be greater than zero');
    }

    if (props.fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes`);
    }

    this.id = props.id ?? crypto.randomUUID();
    this.fileName = props.fileName.trim();
    this.fileType = props.fileType as SupportedFileType;
    this.fileSize = props.fileSize;
    this.storageUrl = props.storageUrl;
    this.previewUrl = props.previewUrl;
  }

  toPlainObject(): DiagramProps & { id: string } {
    return {
      id: this.id,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      storageUrl: this.storageUrl,
      previewUrl: this.previewUrl,
    };
  }
}
