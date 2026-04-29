import { Kafka } from 'kafkajs';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { ReportRepository } from './infrastructure/persistence/ReportRepository';
import { AnalysisCompletedConsumer } from './infrastructure/kafka/AnalysisCompletedConsumer';
import { StoreAnalysisReportUseCase } from './application/use-cases/StoreAnalysisReportUseCase';
import { createServer } from './server';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-reports';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const REPORT_PORT = parseInt(process.env.REPORT_PORT ?? '3002', 10);

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const repository = new ReportRepository();

  const app = createServer(repository);
  app.listen(REPORT_PORT, () => {
    console.log(`[report-service] Tool server listening on port ${REPORT_PORT}`);
  });

  const kafka = new Kafka({
    clientId: 'report-service',
    brokers: KAFKA_BROKERS,
    requestTimeout: 90000,
    retry: { retries: 5 },
  });

  const storeReportUseCase = new StoreAnalysisReportUseCase(repository);
  const consumer = new AnalysisCompletedConsumer(kafka, storeReportUseCase);

  await consumer.connect();
  await consumer.start();

  console.log('[report-service] Kafka consumer listening for analysis.completed events');

  const shutdown = async (): Promise<void> => {
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start report-service:', err);
  process.exit(1);
});
