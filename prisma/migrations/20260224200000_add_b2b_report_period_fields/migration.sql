-- AlterTable
ALTER TABLE "B2bHealthDataSnapshot"
ADD COLUMN "periodKey" TEXT,
ADD COLUMN "reportCycle" INTEGER;

-- AlterTable
ALTER TABLE "B2bSurveyResponse"
ADD COLUMN "periodKey" TEXT,
ADD COLUMN "reportCycle" INTEGER;

-- AlterTable
ALTER TABLE "B2bAnalysisResult"
ADD COLUMN "periodKey" TEXT,
ADD COLUMN "reportCycle" INTEGER;

-- AlterTable
ALTER TABLE "B2bPharmacistNote"
ADD COLUMN "periodKey" TEXT,
ADD COLUMN "reportCycle" INTEGER;

-- AlterTable
ALTER TABLE "B2bReport"
ADD COLUMN "periodKey" TEXT,
ADD COLUMN "reportCycle" INTEGER;

-- CreateIndex
CREATE INDEX "B2bHealthDataSnapshot_employeeId_periodKey_fetchedAt_idx"
ON "B2bHealthDataSnapshot"("employeeId", "periodKey", "fetchedAt");

-- CreateIndex
CREATE INDEX "B2bSurveyResponse_employeeId_periodKey_updatedAt_idx"
ON "B2bSurveyResponse"("employeeId", "periodKey", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bAnalysisResult_employeeId_periodKey_updatedAt_idx"
ON "B2bAnalysisResult"("employeeId", "periodKey", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bPharmacistNote_employeeId_periodKey_updatedAt_idx"
ON "B2bPharmacistNote"("employeeId", "periodKey", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bReport_employeeId_periodKey_createdAt_idx"
ON "B2bReport"("employeeId", "periodKey", "createdAt");
