import express, { Request, Response } from 'express';
import { ClaudeAnalysisClient } from './infrastructure/ai/ClaudeAnalysisClient';
import { OllamaAnalysisClient } from './infrastructure/ai/OllamaAnalysisClient';
import { IAnalysisClient } from './infrastructure/ai/IAnalysisClient';
import { AnalyzeArchitectureUseCase } from './application/use-cases/AnalyzeArchitectureUseCase';
import { AnalyzeArchitectureInput } from './domain/use-cases/IAnalyzeArchitectureUseCase';

const PORT = process.env.PORT ?? 3004;
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'ollama';

const analysisClient: IAnalysisClient =
  AI_PROVIDER === 'claude'
    ? new ClaudeAnalysisClient(process.env.ANTHROPIC_API_KEY ?? '')
    : new OllamaAnalysisClient();

console.log(`Architecture analysis agent using provider: ${AI_PROVIDER}`);

const analyzeUseCase = new AnalyzeArchitectureUseCase(analysisClient);

const app = express();
app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
  try {
    const input: AnalyzeArchitectureInput = {
      action: 'analyze',
      payload: req.body.payload,
    };

    const result = await analyzeUseCase.execute(input);

    res.json({
      analysisId: result.analysisId,
      diagramId: result.diagramId,
      status: result.status,
      components: result.components,
      architecturePatterns: result.architecturePatterns,
      risks: result.risks.map((r) => ({
        title: r.title,
        description: r.description,
        severity: r.severity,
        affectedComponents: r.affectedComponents,
      })),
      recommendations: result.recommendations.map((rec) => ({
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        relatedRisks: rec.relatedRisks,
      })),
      summary: result.summary,
      ...(result.error && { error: result.error }),
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'InternalServerError', message: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Architecture analysis agent running on port ${PORT}`);
});
