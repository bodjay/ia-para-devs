import { Kafka } from 'kafkajs';
import { OrchestrateUseCase } from './application/use-cases/OrchestrateUseCase';
import { ChatRequestedConsumer } from './infrastructure/kafka/ChatRequestedConsumer';
import { ChatRespondedProducer } from './infrastructure/kafka/ChatRespondedProducer';
import { Logger } from '@arch-analyzer/common';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const logger = new Logger('orchestrator-agent');

const kafka = new Kafka({ clientId: 'orchestrator-agent', brokers: KAFKA_BROKERS });

const orchestrateUseCase = new OrchestrateUseCase();
const producer = new ChatRespondedProducer(kafka);
const consumer = new ChatRequestedConsumer(kafka, orchestrateUseCase, producer);

async function start(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();
  logger.info('Orchestrator agent started', {
    brokers: KAFKA_BROKERS,
    model: process.env.OLLAMA_MODEL ?? 'qwen3:4b',
  });
}

async function shutdown(): Promise<void> {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

start().catch((err) => {
  logger.error('Failed to start orchestrator agent', { error: (err as Error).message });
  process.exit(1);
});
