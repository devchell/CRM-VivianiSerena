CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

INSERT INTO "clients" ("id", "lead_id", "name", "email", "phone", "notes", "created_by", "created_at", "updated_at")
SELECT 'client_' || "id", "lead_id", "client_name", "client_email", "client_phone", "notes", "created_by", "created_at", "updated_at"
FROM "client_folders";

ALTER TABLE "client_folders"
  ADD COLUMN "client_id" TEXT,
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Pasta inicial',
  ADD COLUMN "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "client_folders"
SET "client_id" = 'client_' || "id",
    "occurred_at" = "created_at";

ALTER TABLE "client_folders"
  ALTER COLUMN "client_id" SET NOT NULL;

CREATE INDEX "clients_lead_id_idx" ON "clients"("lead_id");
CREATE INDEX "clients_name_idx" ON "clients"("name");
CREATE INDEX "client_folders_client_id_position_idx" ON "client_folders"("client_id", "position");

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_folders"
  ADD CONSTRAINT "client_folders_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'viviani_app') THEN
    RAISE EXCEPTION 'Required runtime role viviani_app does not exist; run ensure-runtime-db-role.sh first';
  END IF;
END $$;

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viviani_runtime_single_tenant" ON "clients"
  FOR ALL TO viviani_app USING (true) WITH CHECK (true);
