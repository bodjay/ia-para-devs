export interface StorageFile {
  name: string;
  size: number;
  type: string;
  buffer?: Buffer;
  path?: string;
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface IStorageAdapter {
  upload(file: StorageFile): Promise<string>;
}
