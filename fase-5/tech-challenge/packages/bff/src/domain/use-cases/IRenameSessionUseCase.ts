export interface IRenameSessionUseCase {
  execute(params: { sessionId: string; name: string }): Promise<{ sessionId: string; name: string }>;
}
