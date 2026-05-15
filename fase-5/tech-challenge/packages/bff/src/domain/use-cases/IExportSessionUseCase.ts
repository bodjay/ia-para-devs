export interface IExportSessionUseCase {
  execute(sessionId: string): Promise<{ text: string }>;
}
