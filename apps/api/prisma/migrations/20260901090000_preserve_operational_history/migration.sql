-- Add nullable archival timestamps. Existing rows remain active.
ALTER TABLE "leads" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "financials" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "leads_deleted_at_idx" ON "leads"("deleted_at");
CREATE INDEX "financials_deleted_at_idx" ON "financials"("deleted_at");
