import { Kafka } from 'kafkajs';
import { createApp } from './app';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { AnalysisRepository } from './infrastructure/persistence/AnalysisRepository';
import { SessionRepository } from './infrastructure/persistence/SessionRepository';
import { MessageRepository } from './infrastructure/persistence/MessageRepository';
import { AnalysisCompletedConsumer } from './infrastructure/kafka/AnalysisCompletedConsumer';
import { OllamaConversationClient } from './infrastructure/ai/OllamaConversationClient';
import { AnalysisController } from './presentation/controllers/AnalysisController';
import { SessionController } from './presentation/controllers/SessionController';
import { CreateAnalysisUseCase } from './application/use-cases/CreateAnalysisUseCase';
import { GetAnalysisUseCase } from './application/use-cases/GetAnalysisUseCase';
import { ListSessionsUseCase } from './application/use-cases/ListSessionsUseCase';
import { CreateSessionUseCase } from './application/use-cases/CreateSessionUseCase';
import { GetMessagesUseCase } from './application/use-cases/GetMessagesUseCase';
import { CreateMessageUseCase } from './application/use-cases/CreateMessageUseCase';

const PORT = process.env.PORT ?? 3001;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-bff';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  // Repositories
  const analysisRepository = new AnalysisRepository();

  // Kafka consumer — updates analysis status when report-service finishes
  const kafka = new Kafka({ clientId: 'bff', brokers: KAFKA_BROKERS });
  const analysisCompletedConsumer = new AnalysisCompletedConsumer(kafka, analysisRepository);
  await analysisCompletedConsumer.connect();
  await analysisCompletedConsumer.start();
  const sessionRepository = new SessionRepository();
  const messageRepository = new MessageRepository();

  // Analysis use cases
  const createAnalysisUseCase = new CreateAnalysisUseCase(analysisRepository);
  const getAnalysisUseCase = new GetAnalysisUseCase(analysisRepository);

  // Session + Message use cases
  const listSessionsUseCase = new ListSessionsUseCase(sessionRepository);
  const createSessionUseCase = new CreateSessionUseCase(sessionRepository);
  const getMessagesUseCase = new GetMessagesUseCase(messageRepository);
  const conversationClient = new OllamaConversationClient();
  const createMessageUseCase = new CreateMessageUseCase(messageRepository, sessionRepository, analysisRepository, conversationClient);

  // Controllers
  const analysisController = new AnalysisController(createAnalysisUseCase, getAnalysisUseCase);
  const sessionController = new SessionController(
    listSessionsUseCase,
    createSessionUseCase,
    getMessagesUseCase,
    createMessageUseCase
  );

  const app = createApp(
    analysisController,
    sessionController,
    createAnalysisUseCase,
    sessionRepository
  );

  app.listen(PORT, () => {
    console.log(`BFF running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start BFF:', err);
  process.exit(1);
});
