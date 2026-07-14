CREATE TABLE "TipsLabSession" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "consentScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TipsLabSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipsLabEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "nextState" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "postconditionsMet" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipsLabEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TipsLabSession_createdAt_idx" ON "TipsLabSession"("createdAt");
CREATE INDEX "TipsLabSession_state_updatedAt_idx" ON "TipsLabSession"("state", "updatedAt");
CREATE UNIQUE INDEX "TipsLabEvent_sessionId_sequence_key" ON "TipsLabEvent"("sessionId", "sequence");
CREATE INDEX "TipsLabEvent_sessionId_createdAt_idx" ON "TipsLabEvent"("sessionId", "createdAt");
CREATE INDEX "TipsLabEvent_action_createdAt_idx" ON "TipsLabEvent"("action", "createdAt");
ALTER TABLE "TipsLabEvent" ADD CONSTRAINT "TipsLabEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TipsLabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
