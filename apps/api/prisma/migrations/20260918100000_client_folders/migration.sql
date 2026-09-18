CREATE TYPE "ClientFolderStage" AS ENUM ('before', 'progress', 'after');

CREATE TABLE "client_folders" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT,
    "service_label" TEXT,
    "notes" TEXT,
    "public_title" TEXT,
    "public_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "public_consent_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_folder_media" (
    "id" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "stage" "ClientFolderStage" NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "original_filename" TEXT NOT NULL,
    "original_storage_key" TEXT NOT NULL,
    "optimized_storage_key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_folder_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_folders_lead_id_idx" ON "client_folders"("lead_id");
CREATE INDEX "client_folders_is_published_updated_at_idx" ON "client_folders"("is_published", "updated_at");
CREATE INDEX "client_folders_client_name_idx" ON "client_folders"("client_name");
CREATE INDEX "client_folder_media_folder_id_captured_at_idx" ON "client_folder_media"("folder_id", "captured_at");

ALTER TABLE "client_folders"
  ADD CONSTRAINT "client_folders_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_folders"
  ADD CONSTRAINT "client_folders_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_folder_media"
  ADD CONSTRAINT "client_folder_media_folder_id_fkey"
  FOREIGN KEY ("folder_id") REFERENCES "client_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'viviani_app') THEN
    RAISE EXCEPTION 'Required runtime role viviani_app does not exist; run ensure-runtime-db-role.sh first';
  END IF;
END $$;

ALTER TABLE "client_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_folder_media" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viviani_runtime_single_tenant" ON "client_folders"
  FOR ALL TO viviani_app USING (true) WITH CHECK (true);
CREATE POLICY "viviani_runtime_single_tenant" ON "client_folder_media"
  FOR ALL TO viviani_app USING (true) WITH CHECK (true);
