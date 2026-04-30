import express, { Request, Response } from 'express';
import { OllamaVisionClient } from './infrastructure/ai/OllamaVisionClient';
import { ProcessingServiceClient } from './infrastructure/tools/ProcessingServiceClient';
import { ExtractDiagramUseCase } from './application/use-cases/ExtractDiagramUseCase';
import { ExtractDiagramInput } from './domain/use-cases/IExtractDiagramUseCase';

const PORT = process.env.PORT ?? 3003;

const processingClient = new ProcessingServiceClient();
const visionClient = new OllamaVisionClient(processingClient);
const extractUseCase = new ExtractDiagramUseCase(visionClient, processingClient);

const app = express();
app.use(express.json({ limit: '20mb' }));

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
  console.log(`Diagram extraction agent HTTP server running on port ${PORT}`);
});
