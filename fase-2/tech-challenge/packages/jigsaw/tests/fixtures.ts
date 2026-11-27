import { IRandomGenerator } from '@tech-challenge/genetic';

export class SequenceRandom implements IRandomGenerator {
  private index = 0;

  constructor(private readonly values: number[]) {}

  next(): number {
    const value = this.values[this.index % this.values.length];
    this.index++;

    return value;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

/**
 * Quebra-cabeça 2x2 escrito à mão para os testes.
 * Ordem das bordas de cada peça: topo, direita, base, esquerda.
 *
 * Peça 0: reta em cima e à esquerda, pino 1 à direita, encaixe 2 embaixo.
 * Peça 1: reta em cima e à direita, encaixe 1 à esquerda, pino 3 embaixo.
 * Peça 2: pino 2 em cima, reta à esquerda e embaixo, pino 4 à direita.
 * Peça 3: encaixe 3 em cima, reta à direita e embaixo, encaixe 4 à esquerda.
 */
export const SMALL_PUZZLE = '2:0,1,-2,0,0,0,3,-1,2,4,0,0,-3,0,0,-4';
