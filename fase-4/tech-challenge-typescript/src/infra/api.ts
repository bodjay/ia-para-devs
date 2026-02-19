import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import logger from '../services/logger.js';
import assistant from '../index.js';

const app = express();

app.use(cors()); // Habilita CORS para todas as origens

app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`[API] Servidor rodando na porta ${PORT}`);
});

export default app;