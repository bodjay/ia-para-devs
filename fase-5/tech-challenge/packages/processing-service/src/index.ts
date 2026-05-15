import { connectMongo } from './infrastructure/db/MongoConnection';
import { ProcessingJobRepository } from './infrastructure/persistence/ProcessingJobRepository';
import { TextractAdapter } from './infrastructure/textract/TextractAdapter';
import { DiagramCreatedConsumer } from './infrastructure/redis/DiagramCreatedConsumer';
import { DiagramProcessedProducer } from './infrastructure/redis/DiagramProcessedProducer';
import { ProcessDiagramUseCase } from './application/use-cases/ProcessDiagramUseCase';
import { disconnectRedis } from './infrastructure/redis/RedisClient';
import { createServer } from './server';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-processing';
const PROCESSING_PORT = parseInt(process.env.PROCESSING_PORT ?? '3001', 10);
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const repository = new ProcessingJobRepository();
  const textractAdapter = new TextractAdapter(AWS_REGION);

  const producer = new DiagramProcessedProducer();
  const useCase = new ProcessDiagramUseCase(repository, textractAdapter, producer);
  const consumer = new DiagramCreatedConsumer(useCase);
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();

  console.log('[processing-service] Redis Streams consumer started — listening for diagram.created events');

  const app = createServer(textractAdapter, repository);
  app.listen(PROCESSING_PORT, () => {
    console.log(`[processing-service] Tool server listening on port ${PROCESSING_PORT}`);
  });

  const shutdown = async () => {
    await consumer.disconnect();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

bootstrap().catch((err) => {
  console.error('[processing-service] Failed to start:', err);
  process.exit(1);
});
