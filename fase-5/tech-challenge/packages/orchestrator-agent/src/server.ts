import express, { Request, Response, NextFunction } from 'express';
import { OrchestrateUseCase } from './application/use-cases/OrchestrateUseCase';
import { OrchestratorInput } from './domain/entities/OrchestratorState';
import { OllamaClient } from './infrastructure/ai/OllamaClient';
import { Logger } from '@arch-analyzer/common';

const PORT = process.env.PORT ?? 3005;
const logger = new Logger('orchestrator-agent');

const orchestrateUseCase = new OrchestrateUseCase();
const ollamaClient = new OllamaClient();

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

app.post('/context/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionName, analysis, conversationTopics } = req.body as {
      sessionName?: string;
      analysis?: {
        summary: string;
        components: string[];
        risks: string[];
        recommendations: string[];
      };
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
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'InternalServerError', message: err.message });
});

app.listen(PORT, () => {
  logger.info('Orchestrator agent started', {
    port: PORT,
    model: process.env.OLLAMA_MODEL ?? 'qwen3:4b',
  });
});
