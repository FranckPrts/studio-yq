-- CreateEnum
CREATE TYPE "report_run_kind" AS ENUM ('TEST', 'REHEARSAL', 'PARTICIPANTS', 'EVERYONE');

-- CreateEnum
CREATE TYPE "report_delivery_status" AS ENUM ('SENT', 'FAILED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "reportNoticeAckAt" TIMESTAMP(3),
ADD COLUMN     "reportNoticeAckById" TEXT,
ADD COLUMN     "reportNoticeVersion" INTEGER;

-- CreateTable
CREATE TABLE "gmail_connections" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "scope" TEXT NOT NULL,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "report_run_kind" NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL,
    "template" JSONB NOT NULL,
    "templateHash" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_deliveries" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "subjectOwner" TEXT NOT NULL,
    "teamUserId" TEXT,
    "status" "report_delivery_status" NOT NULL,
    "error" TEXT,
    "gmailMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_connections_projectId_key" ON "gmail_connections"("projectId");

-- CreateIndex
CREATE INDEX "report_runs_projectId_idx" ON "report_runs"("projectId");

-- CreateIndex
CREATE INDEX "report_deliveries_subjectOwner_idx" ON "report_deliveries"("subjectOwner");

-- CreateIndex
CREATE UNIQUE INDEX "report_deliveries_runId_recipientKey_key" ON "report_deliveries"("runId", "recipientKey");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_reportNoticeAckById_fkey" FOREIGN KEY ("reportNoticeAckById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_runId_fkey" FOREIGN KEY ("runId") REFERENCES "report_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
