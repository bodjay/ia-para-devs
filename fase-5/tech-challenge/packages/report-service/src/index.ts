import { Kafka } from 'kafkajs';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { ReportRepository } from './infrastructure/persistence/ReportRepository';
import { ArchitectureAnalysisAgentClient } from './infrastructure/agents/ArchitectureAnalysisAgentClient';
import { AnalysisCompletedProducer } from './infrastructure/kafka/AnalysisCompletedProducer';
import { DiagramProcessedConsumer } from './infrastructure/kafka/DiagramProcessedConsumer';
import { GenerateReportUseCase } from './application/use-cases/GenerateReportUseCase';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-reports';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const ANALYSIS_AGENT_URL = process.env.ANALYSIS_AGENT_URL ?? 'http://localhost:3004';

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const kafka = new Kafka({
    clientId: 'report-service',
    brokers: KAFKA_BROKERS,
  });

  const repository = new ReportRepository();
  const agentClient = new ArchitectureAnalysisAgentClient(ANALYSIS_AGENT_URL);
  const eventProducer = new AnalysisCompletedProducer(kafka);
  await eventProducer.connect();

  const generateReportUseCase = new GenerateReportUseCase(repository, agentClient, eventProducer);
  const consumer = new DiagramProcessedConsumer(kafka, generateReportUseCase);

  await consumer.connect();
  await consumer.start();

  console.log('Report service started — listening for diagram.processed events');

  const shutdown = async (): Promise<void> => {
    await consumer.disconnect();
    await eventProducer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start report-service:', err);
  process.exit(1);
});
