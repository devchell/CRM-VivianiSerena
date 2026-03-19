CREATE TABLE "email_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "smtp_user" TEXT NOT NULL,
    "password_encrypted" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "from_name" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "email_settings"
ADD CONSTRAINT "email_settings_updated_by_fkey"
FOREIGN KEY ("updated_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
