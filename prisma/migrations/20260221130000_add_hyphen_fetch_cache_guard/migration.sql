-- AlterTable
ALTER TABLE "HealthProviderLink"
ADD COLUMN "lastIdentityHash" TEXT;

-- CreateTable
CREATE TABLE "HealthProviderFetchCache" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "identityHash" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "targets" TEXT[],
    "yearLimit" INTEGER,
    "fromDate" TEXT,
    "toDate" TEXT,
    "subjectType" TEXT,
    "statusCode" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthProviderFetchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthProviderFetchCache_appUserId_provider_requestHash_key"
ON "HealthProviderFetchCache"("appUserId", "provider", "requestHash");

-- CreateIndex
CREATE INDEX "HealthProviderFetchCache_appUserId_provider_expiresAt_idx"
ON "HealthProviderFetchCache"("appUserId", "provider", "expiresAt");

-- CreateIndex
CREATE INDEX "HealthProviderFetchCache_provider_identityHash_expiresAt_idx"
ON "HealthProviderFetchCache"("provider", "identityHash", "expiresAt");

-- CreateIndex
CREATE INDEX "HealthProviderFetchCache_appUserId_fetchedAt_idx"
ON "HealthProviderFetchCache"("appUserId", "fetchedAt");

-- AddForeignKey
ALTER TABLE "HealthProviderFetchCache"
ADD CONSTRAINT "HealthProviderFetchCache_appUserId_fkey"
FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
