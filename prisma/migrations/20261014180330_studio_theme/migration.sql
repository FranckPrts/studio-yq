-- CreateEnum
CREATE TYPE "studio_theme" AS ENUM ('DARK', 'LIGHT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "studioTheme" "studio_theme" NOT NULL DEFAULT 'DARK';
