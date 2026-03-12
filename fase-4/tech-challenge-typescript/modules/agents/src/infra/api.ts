import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../services/logger.js';
import assistant from '../index.js';
import videoAnalysisWorkflow from '../agents/video.analysis.workflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors()); // Habilita CORS para todas as origens
app.use(express.json());

// Serve o frontend de exemplo
app.use('/examples', express.static(path.join(__dirname, '../../examples')));

// Garante que os diretórios de upload existam
['uploads', 'uploads/temp', 'uploads/temp/frames'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb): any => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ─── Rota: Consulta de texto / áudio / vídeo (pipeline de transcrição) ────────

app.post('/query', upload.single('file'), async (req: any, res: any) => {
  const { query } = req.body;
  const filePath = req.file?.path;

  logger.info('[API] Recebendo consulta', { query, filePath: req.file?.originalname });

  try {
    const response = await assistant.atendantWorkflow.invoke({
      query: query || '',
      filePath: filePath || null,
    });

    logger.info('[API] Consulta processada com sucesso', { response });
    res.json(response);
  } catch (error) {
    logger.error('[API] Erro ao processar consulta', error);
    res.status(500).json({ error: 'Erro ao processar consulta' });
  }
});

// ─── Rota: Análise de vídeo clínico especializado em saúde da mulher ──────────

app.post('/analyze-video', upload.single('file'), async (req: any, res: any) => {
  const { analysisType } = req.body;
  const filePath = req.file?.path;

  logger.info('[API] Recebendo vídeo para análise clínica', {
    originalName: req.file?.originalname,
    analysisType,
  });

  if (!filePath) {
    return res.status(400).json({ error: 'Arquivo de vídeo obrigatório. Envie um arquivo .mp4 ou .webm.' });
  }

  try {
    const response = await videoAnalysisWorkflow.invoke({
      filePath,
      videoType: analysisType || null,
    });

    logger.info('[API] Análise de vídeo concluída com sucesso', {
      classification: response.videoClassification,
    });

    res.json({
      videoClassification: response.videoClassification,
      finalReport: response.finalReport,
      framesAnalyzed: response.frames?.length ?? 0,
    });
  } catch (error) {
    logger.error('[API] Erro ao analisar vídeo', error);
    res.status(500).json({ error: 'Erro ao processar análise de vídeo clínico.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`[API] Servidor rodando na porta ${PORT}`);
  logger.info(`[API] Frontend disponível em http://localhost:${PORT}/examples/index.html`);
});

export default app;
