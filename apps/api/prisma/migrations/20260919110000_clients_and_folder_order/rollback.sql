BEGIN;

UPDATE "client_folders" AS folder
SET "client_name" = client."name",
    "client_email" = client."email",
    "client_phone" = client."phone"
FROM "clients" AS client
WHERE folder."client_id" = client."id";

DROP POLICY IF EXISTS "viviani_runtime_single_tenant" ON "clients";
ALTER TABLE "clients" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "clients" DISABLE ROW LEVEL SECURITY;

ALTER TABLE "client_folders" DROP CONSTRAINT IF EXISTS "client_folders_client_id_fkey";
DROP INDEX IF EXISTS "client_folders_client_id_position_idx";
DROP INDEX IF EXISTS "clients_name_idx";
DROP INDEX IF EXISTS "clients_lead_id_idx";

ALTER TABLE "client_folders"
  DROP COLUMN IF EXISTS "client_id",
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "occurred_at",
  DROP COLUMN IF EXISTS "position";

DROP TABLE IF EXISTS "clients";

COMMIT;
