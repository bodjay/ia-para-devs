import { v4 as uuidv4 } from 'uuid';

export const SUPPORTED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'] as const;
export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface DiagramProps {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt?: Date;
  userId: string;
}

export class Diagram {
  readonly id: string;
  readonly fileName: string;
  readonly fileType: SupportedFileType;
  readonly fileSize: number;
  readonly storageUrl: string;
  readonly uploadedAt: Date;
  readonly userId: string;

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

    this.id = props.id ?? uuidv4();
    this.fileName = props.fileName.trim();
    this.fileType = props.fileType as SupportedFileType;
    this.fileSize = props.fileSize;
    this.storageUrl = props.storageUrl;
    this.uploadedAt = props.uploadedAt ?? new Date();
    this.userId = props.userId;
  }
}
