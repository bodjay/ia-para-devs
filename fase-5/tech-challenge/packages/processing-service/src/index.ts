import { Kafka } from 'kafkajs';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { ProcessingJobRepository } from './infrastructure/persistence/ProcessingJobRepository';
import { DiagramExtractionAgentClient } from './infrastructure/agents/DiagramExtractionAgentClient';
import { DiagramCreatedConsumer } from './infrastructure/kafka/DiagramCreatedConsumer';
import { DiagramProcessedProducer } from './infrastructure/kafka/DiagramProcessedProducer';
import { ProcessDiagramUseCase } from './application/use-cases/ProcessDiagramUseCase';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-processing';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const EXTRACTION_AGENT_URL = process.env.EXTRACTION_AGENT_URL ?? 'http://localhost:3003';

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const kafka = new Kafka({ clientId: 'processing-service', brokers: KAFKA_BROKERS });

  const repository = new ProcessingJobRepository();
  const agentClient = new DiagramExtractionAgentClient(EXTRACTION_AGENT_URL);
  const producer = new DiagramProcessedProducer(kafka);
  await producer.connect();

  const processUseCase = new ProcessDiagramUseCase(repository, agentClient, producer);
  const consumer = new DiagramCreatedConsumer(kafka, processUseCase);

  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();

  console.log('Processing service started — listening for diagram.created events');

  const shutdown = async (): Promise<void> => {
    await consumer.disconnect();
    await producer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start processing-service:', err);
  process.exit(1);
});
