-- Rename the stored reset token value to a hash so the raw token is never
-- persisted in the database.
ALTER TABLE "PasswordResetToken"
RENAME COLUMN "token" TO "tokenHash";

ALTER INDEX "PasswordResetToken_token_key"
RENAME TO "PasswordResetToken_tokenHash_key";
