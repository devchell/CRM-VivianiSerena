-- Usernames are normalized to lowercase at the application boundary.
-- Nullable values preserve existing accounts that still use e-mail only.
ALTER TABLE "users" ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
