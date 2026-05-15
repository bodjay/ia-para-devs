export interface UploadDiagramInput {
  file: {
    name: string;
    size: number;
    type: string;
    buffer?: Buffer;
    path?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  sessionId?: string;
}

export interface UploadDiagramOutput {
  diagramId: string;
  status: 'uploaded' | 'queued';
  storageUrl: string;
  uploadedAt: string; // ISO-8601
}

export interface IUploadDiagramUseCase {
  execute(input: UploadDiagramInput): Promise<UploadDiagramOutput>;
}
