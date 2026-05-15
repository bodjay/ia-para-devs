import express, { Request, Response, NextFunction } from 'express';
import { Kafka } from 'kafkajs';
import { OrchestrateUseCase } from './application/use-cases/OrchestrateUseCase';
import { ChatRequestedConsumer } from './infrastructure/kafka/ChatRequestedConsumer';
import { ChatRespondedProducer } from './infrastructure/kafka/ChatRespondedProducer';
import { OllamaClient } from './infrastructure/ai/OllamaClient';
import { Logger } from '@arch-analyzer/common';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const HTTP_PORT = process.env.PORT ?? 3005;
const logger = new Logger('orchestrator-agent');

const kafka = new Kafka({ clientId: 'orchestrator-agent', brokers: KAFKA_BROKERS, requestTimeout: 90000 });
const ollamaClient = new OllamaClient();

const orchestrateUseCase = new OrchestrateUseCase();
const producer = new ChatRespondedProducer(kafka);
const consumer = new ChatRequestedConsumer(kafka, orchestrateUseCase, producer);

const EXPORT_SYSTEM_PROMPT = `Você é um especialista em engenharia de software. Com base nos dados da sessão fornecidos, gere um prompt de ação estruturado, pronto para uso no Claude Code.
NÃO inclua histórico de conversa no output. Responda APENAS com o prompt em Markdown, sem explicações adicionais.

Formato obrigatório:

# Tarefa: [título objetivo]

## Contexto
[resumo do sistema analisado]

## Problemas identificados
[principais riscos com severidade]

## O que implementar
[descrição clara e acionável]

## Notas técnicas
[detalhes relevantes da análise]`;

const app = express();
app.use(express.json());

app.post('/context/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionName, analysis, conversationTopics } = req.body as {
      sessionName?: string;
      analysis?: { summary: string; components: string[]; risks: string[]; recommendations: string[] };
      conversationTopics?: string[];
    };

    if (!sessionName || typeof sessionName !== 'string') {
      res.status(400).json({ error: 'sessionName is required' });
      return;
    }

    logger.info('Processing context export request', { sessionName, hasAnalysis: !!analysis });

    const contextLines: string[] = [`Sessão: ${sessionName}`];
    if (analysis) {
      contextLines.push('\n=== ANÁLISE DE ARQUITETURA ===');
      contextLines.push(`Resumo: ${analysis.summary}`);
      if (analysis.components.length) contextLines.push(`Componentes: ${analysis.components.join(', ')}`);
      if (analysis.risks.length) contextLines.push(`Riscos: ${analysis.risks.join('; ')}`);
      if (analysis.recommendations.length) contextLines.push(`Recomendações: ${analysis.recommendations.join('; ')}`);
    }
    if (conversationTopics && conversationTopics.length) {
      contextLines.push('\n=== TÓPICOS DA CONVERSA ===');
      conversationTopics.forEach((t, i) => contextLines.push(`${i + 1}. ${t}`));
    }

    const text = await ollamaClient.chat([
      { role: 'system', content: EXPORT_SYSTEM_PROMPT },
      { role: 'user', content: contextLines.join('\n') },
    ]);

    logger.info('Context export completed', { sessionName, textLength: text.length });
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled HTTP error', { error: err.message });
  res.status(500).json({ error: 'InternalServerError', message: err.message });
});

async function start(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe();
  await consumer.start();

  app.listen(HTTP_PORT, () => {
    logger.info('Orchestrator agent started', {
      brokers: KAFKA_BROKERS,
      httpPort: HTTP_PORT,
      model: process.env.OLLAMA_MODEL ?? 'qwen3:4b',
    });
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
