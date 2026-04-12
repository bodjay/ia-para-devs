export interface DiagramCreatedEvent {
  eventId: string;
  timestamp: string;
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageUrl: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface IProcessDiagramUseCase {
  execute(event: DiagramCreatedEvent): Promise<void>;
}
