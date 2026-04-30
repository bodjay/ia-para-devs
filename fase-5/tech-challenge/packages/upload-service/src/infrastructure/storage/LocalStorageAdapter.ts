import fs from 'fs';
import path from 'path';
import { IStorageAdapter, StorageFile } from './IStorageAdapter';

const UPLOAD_SERVICE_PUBLIC_URL =
  process.env.UPLOAD_SERVICE_PUBLIC_URL ?? 'http://upload-service:3002';

export class LocalStorageAdapter implements IStorageAdapter {
  constructor(private readonly uploadDir: string) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async upload(file: StorageFile): Promise<string> {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(this.uploadDir, fileName);
    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    }
    return `${UPLOAD_SERVICE_PUBLIC_URL}/uploads/${fileName}`;
  }
}
