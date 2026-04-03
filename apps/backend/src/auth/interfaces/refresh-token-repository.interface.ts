export interface IRefreshTokenRepository {
  create(userId: string, expiresAt: Date): Promise<string>;
  rotate(
    rawToken: string,
    newExpiresAt: Date,
  ): Promise<{ token: string; userId: string } | null>;
  verify(rawToken: string): Promise<{ userId: string } | null>;
  revokeAll(userId: string): Promise<void>;
}
