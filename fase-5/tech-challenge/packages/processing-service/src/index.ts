import { connectMongo } from './infrastructure/db/MongoConnection';
import { ProcessingJobRepository } from './infrastructure/persistence/ProcessingJobRepository';
import { TextractAdapter } from './infrastructure/textract/TextractAdapter';
import { createServer } from './server';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-processing';
const PROCESSING_PORT = parseInt(process.env.PROCESSING_PORT ?? '3001', 10);
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';

async function bootstrap(): Promise<void> {
  await connectMongo(MONGO_URI);

  const repository = new ProcessingJobRepository();
  const textractAdapter = new TextractAdapter(AWS_REGION);

  const app = createServer(textractAdapter, repository);
  app.listen(PROCESSING_PORT, () => {
    console.log(`[processing-service] Tool server listening on port ${PROCESSING_PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start processing-service:', err);
  process.exit(1);
});
