import { Kafka } from 'kafkajs';
import { ChromaVectorRepository } from './infrastructure/vector/ChromaVectorRepository';
import { OllamaEmbeddingFunction } from './infrastructure/embeddings/OllamaEmbeddingFunction';
import { AnalysisCompletedConsumer } from './infrastructure/kafka/AnalysisCompletedConsumer';
import { VectorizeReportUseCase } from './application/use-cases/VectorizeReportUseCase';
import { createServer } from './server';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const PORT = parseInt(process.env.PORT ?? '3006', 10);

async function ensureEmbedModel(embedFn: OllamaEmbeddingFunction): Promise<void> {
  const { baseUrl, model } = embedFn;
  console.log(`[vector-service] Checking Ollama model "${model}" at ${baseUrl}...`);

  try {
    const res = await fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (res.ok) {
      console.log(`[vector-service] Model "${model}" is ready.`);
      return;
    }
  } catch {
    console.warn(`[vector-service] Ollama not reachable at ${baseUrl}, skipping model check.`);
    return;
  }

  console.log(`[vector-service] Model "${model}" not found, pulling...`);
  const pull = await fetch(`${baseUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: model, stream: false }),
  });

  if (pull.ok) {
    console.log(`[vector-service] Model "${model}" pulled successfully.`);
  } else {
    const body = await pull.text().catch(() => '');
    console.error(`[vector-service] Failed to pull model "${model}": ${pull.status} ${body}`);
  }
}

async function bootstrap(): Promise<void> {
  const embedFn = new OllamaEmbeddingFunction();
  await ensureEmbedModel(embedFn);

  const repository = new ChromaVectorRepository();

  const app = createServer(repository);
  app.listen(PORT, () => {
    console.log(`[vector-service] HTTP server listening on port ${PORT}`);
  });

  const kafka = new Kafka({
    clientId: 'vector-service',
    brokers: KAFKA_BROKERS,
    requestTimeout: 90000,
    retry: { retries: 5 },
  });

  const vectorizeUseCase = new VectorizeReportUseCase(repository);
  const consumer = new AnalysisCompletedConsumer(kafka, vectorizeUseCase);

  await consumer.connect();
  await consumer.start();

  console.log('[vector-service] Kafka consumer listening for analysis.completed events');

  const shutdown = async (): Promise<void> => {
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[vector-service] Startup failed:', err);
  process.exit(1);
});
