-- CreateTable
CREATE TABLE "mini_captures" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptKey" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "paramsHash" TEXT NOT NULL,
    "px" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "takenById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mini_captures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mini_captures_projectId_idx" ON "mini_captures"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "mini_captures_projectId_scriptKey_avatarId_key" ON "mini_captures"("projectId", "scriptKey", "avatarId");

-- AddForeignKey
ALTER TABLE "mini_captures" ADD CONSTRAINT "mini_captures_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "map_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "image" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "look" JSONB NOT NULL,
    "scriptKey" TEXT NOT NULL,
    "highlight" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "map_snapshots_projectId_idx" ON "map_snapshots"("projectId");

-- AddForeignKey
ALTER TABLE "map_snapshots" ADD CONSTRAINT "map_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
