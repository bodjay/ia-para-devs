import { createApp } from './app';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { DiagramRepository } from './infrastructure/persistence/DiagramRepository';
import { S3StorageAdapter } from './infrastructure/storage/S3StorageAdapter';
import { LocalStorageAdapter } from './infrastructure/storage/LocalStorageAdapter';
import { DiagramEventProducer } from './infrastructure/kafka/DiagramEventProducer';
import { UploadDiagramUseCase } from './application/use-cases/UploadDiagramUseCase';
import { getRedisClient, disconnectRedis } from './infrastructure/redis/RedisClient';
import { UploadTokenValidator } from './infrastructure/redis/UploadTokenValidator';
import { Kafka } from 'kafkajs';

const PORT = process.env.PORT ?? 3002;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-uploads';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const STORAGE_BACKEND = process.env.STORAGE_BACKEND ?? 'local';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET ?? '';
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const kafka = new Kafka({
    clientId: 'upload-service',
    brokers: KAFKA_BROKERS,
  });
  const producer = new DiagramEventProducer(kafka);
  await producer.connect();

  const redis = getRedisClient();
  const tokenValidator = new UploadTokenValidator(redis);

  const repository = new DiagramRepository();
  const storageAdapter =
    STORAGE_BACKEND === 's3'
      ? new S3StorageAdapter(AWS_S3_BUCKET, AWS_REGION)
      : new LocalStorageAdapter(UPLOAD_DIR);

  console.log(`Storage backend: ${STORAGE_BACKEND}`);

  const uploadUseCase = new UploadDiagramUseCase(repository, storageAdapter, producer);

  const app = createApp(uploadUseCase, tokenValidator);

  app.listen(PORT, () => {
    console.log(`Upload service running on port ${PORT}`);
  });

  process.on('SIGTERM', async () => {
    await producer.disconnect();
    await disconnectRedis();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start upload-service:', err);
  process.exit(1);
});
