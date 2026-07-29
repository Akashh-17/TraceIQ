-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "deviceName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_hashedToken_key" ON "refresh_sessions"("hashedToken");

-- CreateIndex
CREATE INDEX "refresh_sessions_userId_idx" ON "refresh_sessions"("userId");

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
