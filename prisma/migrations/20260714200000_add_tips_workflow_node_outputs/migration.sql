CREATE TABLE "TipsLabArtifact" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipsLabArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipsLabWorkItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "dueAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipsLabWorkItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TipsLabArtifact_sessionId_createdAt_idx" ON "TipsLabArtifact"("sessionId", "createdAt");
CREATE INDEX "TipsLabArtifact_nodeId_kind_createdAt_idx" ON "TipsLabArtifact"("nodeId", "kind", "createdAt");
CREATE INDEX "TipsLabWorkItem_sessionId_status_createdAt_idx" ON "TipsLabWorkItem"("sessionId", "status", "createdAt");
CREATE INDEX "TipsLabWorkItem_workType_status_dueAt_idx" ON "TipsLabWorkItem"("workType", "status", "dueAt");
ALTER TABLE "TipsLabArtifact" ADD CONSTRAINT "TipsLabArtifact_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TipsLabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipsLabWorkItem" ADD CONSTRAINT "TipsLabWorkItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TipsLabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
