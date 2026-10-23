-- CreateEnum
CREATE TYPE "platform_role" AS ENUM ('MEMBER', 'CREATOR', 'RESEARCHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platformRole" "platform_role" NOT NULL DEFAULT 'MEMBER';
