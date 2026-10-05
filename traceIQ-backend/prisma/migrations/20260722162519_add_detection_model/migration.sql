-- CreateEnum
CREATE TYPE "DetectionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DetectionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "detections" (
    "id" UUID NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleDescription" TEXT NOT NULL,
    "severity" "DetectionSeverity" NOT NULL,
    "status" "DetectionStatus" NOT NULL DEFAULT 'OPEN',
    "actor" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "supportingEventIds" TEXT[],
    "metadata" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "detections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detections_tenantId_triggeredAt_idx" ON "detections"("tenantId", "triggeredAt" DESC);

-- CreateIndex
CREATE INDEX "detections_tenantId_actor_idx" ON "detections"("tenantId", "actor");

-- CreateIndex
CREATE INDEX "detections_tenantId_severity_idx" ON "detections"("tenantId", "severity");

-- AddForeignKey
ALTER TABLE "detections" ADD CONSTRAINT "detections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
