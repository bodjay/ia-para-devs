export class InvalidJigsawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJigsawError';
  }
}
