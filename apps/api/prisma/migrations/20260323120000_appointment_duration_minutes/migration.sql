-- AddColumn: duration_minutes to appointments
ALTER TABLE "appointments" ADD COLUMN "duration_minutes" INTEGER NOT NULL DEFAULT 60;
