/*
  Warnings:

  - You are about to drop the `archive_metadata` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `export_jobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "archive_metadata" DROP CONSTRAINT "archive_metadata_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "export_jobs" DROP CONSTRAINT "export_jobs_tenantId_fkey";

-- DropTable
DROP TABLE "archive_metadata";

-- DropTable
DROP TABLE "export_jobs";

-- DropEnum
DROP TYPE "ExportFormat";

-- DropEnum
DROP TYPE "ExportStatus";
