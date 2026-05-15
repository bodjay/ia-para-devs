export interface UploadToken {
  token: string;
  expiresIn: number;
}

export interface IUploadTokenStore {
  generateToken(sessionId: string): Promise<UploadToken>;
}
