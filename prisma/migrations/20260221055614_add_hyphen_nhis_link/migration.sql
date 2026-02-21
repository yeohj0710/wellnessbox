-- CreateTable
CREATE TABLE "HealthProviderLink" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "linked" BOOLEAN NOT NULL DEFAULT false,
    "loginMethod" TEXT,
    "loginOrgCd" TEXT,
    "stepMode" TEXT,
    "stepData" JSONB,
    "cookieData" JSONB,
    "lastLinkedAt" TIMESTAMP(3),
    "lastFetchedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthProviderLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthProviderLink_provider_linked_idx" ON "HealthProviderLink"("provider", "linked");

-- CreateIndex
CREATE INDEX "HealthProviderLink_appUserId_updatedAt_idx" ON "HealthProviderLink"("appUserId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProviderLink_appUserId_provider_key" ON "HealthProviderLink"("appUserId", "provider");

-- AddForeignKey
ALTER TABLE "HealthProviderLink" ADD CONSTRAINT "HealthProviderLink_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
