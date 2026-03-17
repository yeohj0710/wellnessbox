-- CreateTable
CREATE TABLE "AiExperimentEvent" (
    "id" TEXT NOT NULL,
    "experimentKey" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "surface" TEXT,
    "route" TEXT,
    "sessionKey" TEXT,
    "appUserId" TEXT,
    "clientId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiExperimentEvent_experimentKey_createdAt_idx" ON "AiExperimentEvent"("experimentKey", "createdAt");

-- CreateIndex
CREATE INDEX "AiExperimentEvent_experimentKey_variantKey_eventName_createdAt_idx" ON "AiExperimentEvent"("experimentKey", "variantKey", "eventName", "createdAt");

-- CreateIndex
CREATE INDEX "AiExperimentEvent_surface_createdAt_idx" ON "AiExperimentEvent"("surface", "createdAt");

-- CreateIndex
CREATE INDEX "AiExperimentEvent_appUserId_createdAt_idx" ON "AiExperimentEvent"("appUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AiExperimentEvent_clientId_createdAt_idx" ON "AiExperimentEvent"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiExperimentEvent" ADD CONSTRAINT "AiExperimentEvent_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiExperimentEvent" ADD CONSTRAINT "AiExperimentEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
