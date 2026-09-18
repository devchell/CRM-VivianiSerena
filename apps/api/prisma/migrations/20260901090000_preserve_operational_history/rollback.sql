-- Reverse only the schema change introduced by migration.sql.
DROP INDEX IF EXISTS "leads_deleted_at_idx";
DROP INDEX IF EXISTS "financials_deleted_at_idx";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "financials" DROP COLUMN IF EXISTS "deleted_at";
