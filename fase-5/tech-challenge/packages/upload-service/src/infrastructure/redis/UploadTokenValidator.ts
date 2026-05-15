import type Redis from 'ioredis';

export interface TokenPayload {
  sessionId: string;
}

export class UploadTokenValidator {
  constructor(private readonly redis: Redis) {}

  async validateAndConsume(token: string): Promise<TokenPayload | null> {
    const key = `upload:token:${token}`;
    const [value] = await this.redis.pipeline().get(key).del(key).exec() as [
      [Error | null, string | null],
      [Error | null, number]
    ];

    const raw = value[1];
    if (!raw) return null;

    try {
      return JSON.parse(raw) as TokenPayload;
    } catch {
      return null;
    }
  }
}
