-- CreateTable
CREATE TABLE "lead_status_templates" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_status_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_status_templates_status_channel_key" ON "lead_status_templates"("status", "channel");
