-- Reverses 20260319213000_email_settings.
-- WARNING: this permanently removes the configured SMTP settings.
-- Take a verified backup before executing this script in any shared environment.
BEGIN;

DROP TABLE IF EXISTS "email_settings";

COMMIT;
