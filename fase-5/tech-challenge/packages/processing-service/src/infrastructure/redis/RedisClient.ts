import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
    client.on('error', (err) => console.error('[Redis] connection error:', err.message));
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
