BEGIN;

DROP POLICY IF EXISTS "viviani_runtime_single_tenant" ON "client_folder_media";
DROP POLICY IF EXISTS "viviani_runtime_single_tenant" ON "client_folders";
ALTER TABLE "client_folder_media" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "client_folders" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "client_folder_media" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "client_folders" DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS "client_folder_media";
DROP TABLE IF EXISTS "client_folders";
DROP TYPE IF EXISTS "ClientFolderStage";

COMMIT;
