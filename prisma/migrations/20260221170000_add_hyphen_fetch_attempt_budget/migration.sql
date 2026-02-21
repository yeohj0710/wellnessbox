-- CreateTable
CREATE TABLE "HealthProviderFetchAttempt" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "identityHash" TEXT,
    "requestHash" TEXT,
    "requestKey" TEXT,
    "forceRefresh" BOOLEAN NOT NULL DEFAULT false,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" INTEGER,
    "ok" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthProviderFetchAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthProviderFetchAttempt_appUserId_provider_createdAt_idx"
ON "HealthProviderFetchAttempt"("appUserId", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "HealthProviderFetchAttempt_appUserId_provider_forceRefresh_createdAt_idx"
ON "HealthProviderFetchAttempt"("appUserId", "provider", "forceRefresh", "createdAt");

-- CreateIndex
CREATE INDEX "HealthProviderFetchAttempt_provider_createdAt_idx"
ON "HealthProviderFetchAttempt"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "HealthProviderFetchAttempt"
ADD CONSTRAINT "HealthProviderFetchAttempt_appUserId_fkey"
FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
