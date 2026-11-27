import { EvolutionRunner, ImmediateScheduler, MathRandomGenerator } from '@tech-challenge/genetic';
import { JigsawAlgorithmFactory, SolveJigsawUseCase } from '@tech-challenge/jigsaw';
import { JigsawGameModule } from './games/JigsawGameModule';
import { createServer } from './http/createServer';

const port = Number(process.env.PORT ?? 3000);

const random = new MathRandomGenerator();
const runner = new EvolutionRunner(new ImmediateScheduler());

const app = createServer({
  games: [
    new JigsawGameModule(new SolveJigsawUseCase(new JigsawAlgorithmFactory(random), runner)),
  ],
});

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
