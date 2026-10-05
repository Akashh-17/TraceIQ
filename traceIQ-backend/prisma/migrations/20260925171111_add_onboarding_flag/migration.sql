-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "investigations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "actor" TEXT,
    "summary" TEXT NOT NULL,
    "findings" TEXT[],
    "recommendations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investigations_tenantId_createdAt_idx" ON "investigations"("tenantId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
