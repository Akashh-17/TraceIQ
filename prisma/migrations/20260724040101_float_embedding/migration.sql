-- CreateEnum
CREATE TYPE "DetectionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DetectionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "detections" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actor" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleDescription" TEXT NOT NULL,
    "severity" "DetectionSeverity" NOT NULL,
    "status" "DetectionStatus" NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB,
    "supportingEventIds" UUID[],
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detections_tenantId_actor_idx" ON "detections"("tenantId", "actor");

-- CreateIndex
CREATE INDEX "detections_tenantId_status_idx" ON "detections"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "detections" ADD CONSTRAINT "detections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
