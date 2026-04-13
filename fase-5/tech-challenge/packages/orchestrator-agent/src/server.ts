import express, { Request, Response, NextFunction } from 'express';
import { OrchestrateUseCase } from './application/use-cases/OrchestrateUseCase';
import { OrchestratorInput } from './domain/entities/OrchestratorState';
import { Logger } from '@arch-analyzer/common';

const PORT = process.env.PORT ?? 3005;
const logger = new Logger('orchestrator-agent');

const orchestrateUseCase = new OrchestrateUseCase();

const app = express();
app.use(express.json());

app.post('/analysis/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: OrchestratorInput = {
      question: req.body.question,
      analysisContext: req.body.analysisContext ?? null,
      history: req.body.history ?? [],
    };

    if (!input.question || typeof input.question !== 'string') {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    logger.info('Processing chat request', {
      hasContext: !!input.analysisContext,
      historyLength: input.history.length,
    });

    const output = await orchestrateUseCase.execute(input);

    logger.info('Chat request completed', { route: output.route });
    res.json(output);
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'InternalServerError', message: err.message });
});

app.listen(PORT, () => {
  logger.info('Orchestrator agent started', {
    port: PORT,
    model: process.env.OLLAMA_MODEL ?? 'qwen3:4b',
  });
});
