import express, { Request, Response } from 'express';
import { ClaudeVisionClient } from './infrastructure/ai/ClaudeVisionClient';
import { ExtractDiagramUseCase } from './application/use-cases/ExtractDiagramUseCase';
import { ExtractDiagramInput } from './domain/use-cases/IExtractDiagramUseCase';

const PORT = process.env.PORT ?? 3003;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

const claudeVisionClient = new ClaudeVisionClient(ANTHROPIC_API_KEY);
const extractUseCase = new ExtractDiagramUseCase(claudeVisionClient);

const app = express();
app.use(express.json());

app.post('/extract', async (req: Request, res: Response) => {
  try {
    const input: ExtractDiagramInput = {
      action: 'extract',
      payload: req.body,
    };

    const result = await extractUseCase.execute(input);

    res.json({
      diagramId: result.diagramId,
      status: result.status,
      extractedText: result.extractedText,
      elements: result.elements.map((el) => ({
        id: el.id,
        label: el.label,
        type: el.type,
        confidence: el.confidence,
        boundingBox: el.boundingBox,
      })),
      connections: result.connections,
      ...(result.error && { error: result.error }),
    });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: 'InternalServerError', message: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Diagram extraction agent running on port ${PORT}`);
});
