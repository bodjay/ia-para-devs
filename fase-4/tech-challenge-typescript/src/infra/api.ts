import express from 'express';
import cors from 'cors';
import logger from '../services/logger.js';
import assistant from '../index.js';

const app = express();

app.use(cors()); // Habilita CORS para todas as origens


app.use(express.json());

app.post('/query', async (req: any, res: any) => {
  const { query } = req.body;

  logger.info('[API] Recebendo consulta', { query });

  try {
    const response = await assistant.atendantWorkflow.invoke({
      query
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