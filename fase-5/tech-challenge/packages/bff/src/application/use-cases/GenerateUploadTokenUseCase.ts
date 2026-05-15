import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IUploadTokenStore, UploadToken } from '../../domain/services/IUploadTokenStore';

export class GenerateUploadTokenUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly tokenStore: IUploadTokenStore
  ) {}

  async execute(sessionId: string): Promise<UploadToken> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return this.tokenStore.generateToken(sessionId);
  }
}
