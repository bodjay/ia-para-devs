import { Kafka } from 'kafkajs';
import { ClaudeAnalysisClient } from './infrastructure/ai/ClaudeAnalysisClient';
import { OllamaAnalysisClient } from './infrastructure/ai/OllamaAnalysisClient';
import { IAnalysisClient } from './infrastructure/ai/IAnalysisClient';
import { AnalyzeArchitectureUseCase } from './application/use-cases/AnalyzeArchitectureUseCase';
import { DiagramProcessedConsumer } from './infrastructure/kafka/DiagramProcessedConsumer';
import { AnalysisCompletedProducer } from './infrastructure/kafka/AnalysisCompletedProducer';

const AI_PROVIDER = process.env.AI_PROVIDER ?? 'ollama';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

const analysisClient: IAnalysisClient =
  AI_PROVIDER === 'claude'
    ? new ClaudeAnalysisClient(process.env.ANTHROPIC_API_KEY ?? '')
    : new OllamaAnalysisClient();

const kafka = new Kafka({ clientId: 'architecture-analysis-agent', brokers: KAFKA_BROKERS, requestTimeout: 90000 });

const analyzeUseCase = new AnalyzeArchitectureUseCase(analysisClient);
const producer = new AnalysisCompletedProducer(kafka);
const consumer = new DiagramProcessedConsumer(kafka, analyzeUseCase, producer);

async function start(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();
  console.log('[architecture-analysis-agent] Listening for diagram.processed events');
}

async function shutdown(): Promise<void> {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

start().catch((err) => {
  console.error('[architecture-analysis-agent] Failed to start:', err);
  process.exit(1);
});
