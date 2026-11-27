import { IScheduler } from './IScheduler';

/**
 * Devolve o controle para o event loop entre os lotes de gerações,
 * permitindo que o servidor envie o progresso e perceba cancelamentos.
 */
export class ImmediateScheduler implements IScheduler {
  yield(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }
}
