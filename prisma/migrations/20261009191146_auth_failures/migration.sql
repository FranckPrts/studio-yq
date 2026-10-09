-- CreateTable
CREATE TABLE "auth_failures" (
    "id" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_failures_subjectHash_createdAt_idx" ON "auth_failures"("subjectHash", "createdAt");

-- CreateIndex
CREATE INDEX "auth_failures_createdAt_idx" ON "auth_failures"("createdAt");
