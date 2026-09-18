-- Reverses 20260323120000_appointment_duration_minutes.
-- WARNING: dropping this column permanently removes custom appointment durations.
-- Take a verified backup before executing this script in any shared environment.
BEGIN;

ALTER TABLE "appointments"
  DROP COLUMN IF EXISTS "duration_minutes";

COMMIT;
