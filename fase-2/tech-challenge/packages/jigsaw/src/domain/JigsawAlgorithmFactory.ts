import {
  GeneticAlgorithm,
  GeneticAlgorithmConfig,
  IRandomGenerator,
  TournamentSelection,
} from '@tech-challenge/genetic';
import { JigsawBoard, Placement } from './JigsawBoard';
import { BlockCrossover } from './operators/BlockCrossover';
import { EdgeMismatchEvaluator } from './operators/EdgeMismatchEvaluator';
import { GreedyPlacementFactory } from './operators/GreedyPlacementFactory';
import { PermutationFactory } from './operators/PermutationFactory';
import { SwapMutation } from './operators/SwapMutation';

export interface IJigsawAlgorithmFactory {
  create(board: JigsawBoard, config: GeneticAlgorithmConfig): GeneticAlgorithm<Placement>;
}

export class JigsawAlgorithmFactory implements IJigsawAlgorithmFactory {
  constructor(private readonly random: IRandomGenerator) {}

  create(board: JigsawBoard, config: GeneticAlgorithmConfig): GeneticAlgorithm<Placement> {
    return new GeneticAlgorithm<Placement>(config, {
      chromosomeFactory: new PermutationFactory(this.random, board),
      fitnessEvaluator: new EdgeMismatchEvaluator(board),
      selection: new TournamentSelection<Placement>(this.random, config.tournamentSize),
      crossover: new BlockCrossover(this.random, board),
      mutation: new SwapMutation(this.random, board),
      random: this.random,
      hotstartFactory: new GreedyPlacementFactory(this.random, board),
    });
  }
}
