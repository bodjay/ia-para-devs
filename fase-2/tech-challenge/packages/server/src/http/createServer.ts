import express, { Express } from 'express';
import path from 'path';
import { GameModule } from '../games/GameModule';
import { SolveController } from './SolveController';

export interface ServerDependencies {
  games: GameModule[];
  publicDir?: string;
}

export function createServer(dependencies: ServerDependencies): Express {
  const app = express();
  const publicDir = dependencies.publicDir ?? defaultPublicDir();

  app.use(express.static(publicDir));

  app.get('/api/games', (_req, res) => {
    res.json(dependencies.games.map(({ id, label }) => ({ id, label })));
  });

  for (const game of dependencies.games) {
    app.get(`/api/games/${game.id}/puzzles`, (_req, res) => {
      res.json(game.puzzles());
    });

    app.get(`/api/games/${game.id}/solve`, new SolveController(game).handle);
  }

  return app;
}

function defaultPublicDir(): string {
  return path.join(path.dirname(require.resolve('@tech-challenge/web/package.json')), 'public');
}
