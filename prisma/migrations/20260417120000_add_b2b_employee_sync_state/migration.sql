-- CreateTable
CREATE TABLE "B2bEmployeeSyncState" (
    "employeeId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "periodKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "step" TEXT,
    "forceRefresh" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "runnerToken" TEXT,
    "runnerHeartbeatAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastResultSource" TEXT,
    "lastSnapshotId" TEXT,
    "lastReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bEmployeeSyncState_pkey" PRIMARY KEY ("employeeId")
);

-- CreateIndex
CREATE INDEX "B2bEmployeeSyncState_appUserId_updatedAt_idx" ON "B2bEmployeeSyncState"("appUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bEmployeeSyncState_status_nextRetryAt_updatedAt_idx" ON "B2bEmployeeSyncState"("status", "nextRetryAt", "updatedAt");

-- AddForeignKey
ALTER TABLE "B2bEmployeeSyncState" ADD CONSTRAINT "B2bEmployeeSyncState_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bEmployeeSyncState" ADD CONSTRAINT "B2bEmployeeSyncState_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
