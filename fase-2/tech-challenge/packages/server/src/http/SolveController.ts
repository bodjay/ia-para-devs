import { Request, Response } from 'express';
import { GameModule } from '../games/GameModule';
import { toQuery } from './query';

/**
 * Transmite a evolução do algoritmo via Server-Sent Events.
 * Se o cliente fechar a conexão, a execução é cancelada.
 */
export class SolveController {
  constructor(private readonly game: GameModule) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    const abort = new AbortController();
    res.on('close', () => abort.abort());

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await this.game.solve(toQuery(req.query), (progress) => send('progress', progress), abort.signal);
      send('done', result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado.';
      send('failure', { message });
    }

    res.end();
  };
}
