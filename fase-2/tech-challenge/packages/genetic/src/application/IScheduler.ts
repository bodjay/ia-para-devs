export interface IScheduler {
  yield(): Promise<void>;
}
