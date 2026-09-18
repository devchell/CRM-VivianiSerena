-- Reverses 20260323200000_add_lead_status_templates.
-- WARNING: this permanently removes the lead status message templates.
-- Take a verified backup before executing this script in any shared environment.
BEGIN;

DROP TABLE IF EXISTS "lead_status_templates";

COMMIT;
