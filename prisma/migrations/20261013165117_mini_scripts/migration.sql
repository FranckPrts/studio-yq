-- CreateTable
CREATE TABLE "mini_scripts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT,
    "code" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mini_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mini_scripts_projectId_idx" ON "mini_scripts"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "mini_scripts_projectId_version_key" ON "mini_scripts"("projectId", "version");

-- AddForeignKey
ALTER TABLE "mini_scripts" ADD CONSTRAINT "mini_scripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
