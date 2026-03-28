export type RefreshJwtPayload = {
  sub: string; // User ID
  email: string;
  refreshTokenId: string;
};
