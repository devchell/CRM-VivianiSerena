-- Reverse only the schema change introduced by migration.sql.
DROP INDEX IF EXISTS "users_username_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";
