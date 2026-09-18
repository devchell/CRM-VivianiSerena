-- Reverses 20260319151500_two_factor_channels.
-- WARNING: dropping these columns permanently removes their stored values.
-- Take a verified backup before executing this script in any shared environment.
BEGIN;

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "two_factor_email_enabled",
  DROP COLUMN IF EXISTS "two_factor_sms_enabled";

COMMIT;
