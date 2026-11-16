-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "reportSnapshotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_reportSnapshotId_key" ON "projects"("reportSnapshotId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_reportSnapshotId_fkey" FOREIGN KEY ("reportSnapshotId") REFERENCES "map_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
