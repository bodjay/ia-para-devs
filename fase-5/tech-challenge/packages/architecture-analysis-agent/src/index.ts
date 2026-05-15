import { Kafka } from 'kafkajs';
import { OllamaAnalysisClient } from './infrastructure/ai/OllamaAnalysisClient';
import { IAnalysisClient } from './infrastructure/ai/IAnalysisClient';
import { ReportServiceClient } from './infrastructure/tools/ReportServiceClient';
import { AnalyzeArchitectureUseCase } from './application/use-cases/AnalyzeArchitectureUseCase';
import { DiagramProcessedConsumer } from './infrastructure/redis/DiagramProcessedConsumer';
import { AnalysisCompletedProducer } from './infrastructure/kafka/AnalysisCompletedProducer';
import { disconnectRedis } from './infrastructure/redis/RedisClient';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL ?? 'http://localhost:3002';

const analysisClient: IAnalysisClient = new OllamaAnalysisClient();
const reportClient = new ReportServiceClient(REPORT_SERVICE_URL);

const kafka = new Kafka({ clientId: 'architecture-analysis-agent', brokers: KAFKA_BROKERS, requestTimeout: 90000 });

const analyzeUseCase = new AnalyzeArchitectureUseCase(analysisClient, reportClient);
const producer = new AnalysisCompletedProducer(kafka);
const consumer = new DiagramProcessedConsumer(analyzeUseCase, producer);

async function start(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();
  console.log('[architecture-analysis-agent] Listening for diagram.processed events via Redis Streams');
}

async function shutdown(): Promise<void> {
  await consumer.disconnect();
  await producer.disconnect();
  await disconnectRedis();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

start().catch((err) => {
  console.error('[architecture-analysis-agent] Failed to start:', err);
  process.exit(1);
});
