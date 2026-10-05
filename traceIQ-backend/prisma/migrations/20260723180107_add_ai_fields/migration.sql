/*
  Warnings:

  - You are about to drop the `detections` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "detections" DROP CONSTRAINT "detections_tenantId_fkey";

-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "embedding" DOUBLE PRECISION[],
ADD COLUMN     "nlRepresentation" TEXT;

-- DropTable
DROP TABLE "detections";

-- DropEnum
DROP TYPE "DetectionSeverity";

-- DropEnum
DROP TYPE "DetectionStatus";
