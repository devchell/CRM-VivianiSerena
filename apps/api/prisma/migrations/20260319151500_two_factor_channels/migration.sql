ALTER TABLE "users"
ADD COLUMN "two_factor_email_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "two_factor_sms_enabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users"
SET
  "two_factor_enabled" = false,
  "two_factor_email_enabled" = false,
  "two_factor_sms_enabled" = false;
