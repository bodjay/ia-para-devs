import { Kafka } from 'kafkajs';
import { ClaudeVisionClient } from './infrastructure/ai/ClaudeVisionClient';
import { OllamaVisionClient } from './infrastructure/ai/OllamaVisionClient';
import { IVisionClient } from './infrastructure/ai/IVisionClient';
import { ExtractDiagramUseCase } from './application/use-cases/ExtractDiagramUseCase';
import { DiagramCreatedConsumer } from './infrastructure/kafka/DiagramCreatedConsumer';
import { DiagramProcessedProducer } from './infrastructure/kafka/DiagramProcessedProducer';

const AI_PROVIDER = process.env.AI_PROVIDER ?? 'claude';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

const visionClient: IVisionClient =
  AI_PROVIDER === 'ollama'
    ? new OllamaVisionClient()
    : new ClaudeVisionClient(process.env.ANTHROPIC_API_KEY ?? '');

const kafka = new Kafka({ clientId: 'diagram-extraction-agent', brokers: KAFKA_BROKERS, requestTimeout: 90000 });

const extractUseCase = new ExtractDiagramUseCase(visionClient);
const producer = new DiagramProcessedProducer(kafka);
const consumer = new DiagramCreatedConsumer(kafka, extractUseCase, producer);

async function start(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();
  console.log('[diagram-extraction-agent] Listening for diagram.created events');
}

async function shutdown(): Promise<void> {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

start().catch((err) => {
  console.error('[diagram-extraction-agent] Failed to start:', err);
  process.exit(1);
});
