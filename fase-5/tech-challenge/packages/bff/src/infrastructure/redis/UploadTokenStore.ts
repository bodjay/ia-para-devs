import { v4 as uuidv4 } from 'uuid';
import type Redis from 'ioredis';
import { IUploadTokenStore, UploadToken } from '../../domain/services/IUploadTokenStore';

const TOKEN_TTL_SECONDS = 900;

export class UploadTokenStore implements IUploadTokenStore {
  constructor(private readonly redis: Redis) {}

  async generateToken(sessionId: string): Promise<UploadToken> {
    const token = uuidv4();
    const payload = JSON.stringify({ sessionId });
    await this.redis.setex(`upload:token:${token}`, TOKEN_TTL_SECONDS, payload);
    return { token, expiresIn: TOKEN_TTL_SECONDS };
  }
}
