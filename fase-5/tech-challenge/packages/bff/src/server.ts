import { createApp } from './app';
import { connectMongo } from './infrastructure/db/MongoConnection';
import { AnalysisRepository } from './infrastructure/persistence/AnalysisRepository';
import { AnalysisController } from './presentation/controllers/AnalysisController';
import { CreateAnalysisUseCase } from './application/use-cases/CreateAnalysisUseCase';
import { GetAnalysisUseCase } from './application/use-cases/GetAnalysisUseCase';

const PORT = process.env.PORT ?? 3001;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-bff';

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const repository = new AnalysisRepository();
  const createUseCase = new CreateAnalysisUseCase(repository);
  const getUseCase = new GetAnalysisUseCase(repository);
  const controller = new AnalysisController(createUseCase, getUseCase);

  const app = createApp(controller);

  app.listen(PORT, () => {
    console.log(`BFF running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start BFF:', err);
  process.exit(1);
});
