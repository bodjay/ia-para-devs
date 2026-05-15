import { Kafka } from 'kafkajs';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { ProcessingJobRepository } from './infrastructure/persistence/ProcessingJobRepository';
import { TextractAdapter } from './infrastructure/textract/TextractAdapter';
import { DiagramCreatedConsumer } from './infrastructure/kafka/DiagramCreatedConsumer';
import { DiagramProcessedProducer } from './infrastructure/kafka/DiagramProcessedProducer';
import { ProcessDiagramUseCase } from './application/use-cases/ProcessDiagramUseCase';
import { createServer } from './server';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-processing';
const PROCESSING_PORT = parseInt(process.env.PROCESSING_PORT ?? '3001', 10);
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const repository = new ProcessingJobRepository();
  const textractAdapter = new TextractAdapter(AWS_REGION);

  const kafka = new Kafka({ clientId: 'processing-service', brokers: KAFKA_BROKERS });
  const producer = new DiagramProcessedProducer(kafka);
  await producer.connect();

  const useCase = new ProcessDiagramUseCase(repository, textractAdapter, producer);
  const consumer = new DiagramCreatedConsumer(kafka, useCase);
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();

  console.log('[processing-service] Kafka consumer started — listening for diagram.created events');

  const app = createServer(textractAdapter, repository);
  app.listen(PROCESSING_PORT, () => {
    console.log(`[processing-service] Tool server listening on port ${PROCESSING_PORT}`);
  });

  const shutdown = async () => {
    await consumer.disconnect();
    await producer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

bootstrap().catch((err) => {
  console.error('[processing-service] Failed to start:', err);
  process.exit(1);
});
