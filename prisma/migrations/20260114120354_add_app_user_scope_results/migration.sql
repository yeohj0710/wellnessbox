-- Add appUserId to AssessmentResult and CheckAiResult for account-scoped reads
ALTER TABLE "AssessmentResult" ADD COLUMN "appUserId" TEXT;
ALTER TABLE "CheckAiResult" ADD COLUMN "appUserId" TEXT;

-- Indexes for account-scoped lookups
CREATE INDEX "AssessmentResult_appUserId_createdAt_idx" ON "AssessmentResult"("appUserId", "createdAt");
CREATE INDEX "CheckAiResult_appUserId_createdAt_idx" ON "CheckAiResult"("appUserId", "createdAt");

-- Foreign keys to AppUser
ALTER TABLE "AssessmentResult"
  ADD CONSTRAINT "AssessmentResult_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CheckAiResult"
  ADD CONSTRAINT "CheckAiResult_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
