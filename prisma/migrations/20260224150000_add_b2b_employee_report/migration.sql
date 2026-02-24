-- CreateTable
CREATE TABLE "B2bEmployee" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT,
    "name" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "identityHash" TEXT NOT NULL,
    "linkedProvider" TEXT NOT NULL DEFAULT 'HYPHEN_NHIS',
    "lastSyncedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bHealthDataSnapshot" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'HYPHEN_NHIS',
    "sourceMode" TEXT NOT NULL DEFAULT 'hyphen',
    "rawJson" JSONB NOT NULL,
    "normalizedJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bHealthDataSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bSurveyTemplate" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bSurveyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bSurveyResponse" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "selectedSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answersJson" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bSurveyAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "sectionKey" TEXT,
    "answerText" TEXT,
    "answerValue" TEXT,
    "score" DOUBLE PRECISION,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bSurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bAnalysisResult" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bAnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bPharmacistNote" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "note" TEXT,
    "recommendations" TEXT,
    "cautions" TEXT,
    "createdByAdminTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bPharmacistNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bReport" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "variantIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pageSize" TEXT NOT NULL DEFAULT 'A4',
    "stylePreset" TEXT,
    "reportPayload" JSONB NOT NULL,
    "layoutDsl" JSONB,
    "exportAudit" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bEmployeeAccessLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "appUserId" TEXT,
    "action" TEXT NOT NULL,
    "route" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bEmployeeAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bAdminActionLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "actorTag" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bAdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "B2bEmployee_identityHash_key" ON "B2bEmployee"("identityHash");

-- CreateIndex
CREATE INDEX "B2bEmployee_appUserId_updatedAt_idx" ON "B2bEmployee"("appUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bEmployee_name_birthDate_phoneNormalized_idx" ON "B2bEmployee"("name", "birthDate", "phoneNormalized");

-- CreateIndex
CREATE INDEX "B2bEmployee_phoneNormalized_updatedAt_idx" ON "B2bEmployee"("phoneNormalized", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bHealthDataSnapshot_employeeId_fetchedAt_idx" ON "B2bHealthDataSnapshot"("employeeId", "fetchedAt");

-- CreateIndex
CREATE INDEX "B2bHealthDataSnapshot_provider_fetchedAt_idx" ON "B2bHealthDataSnapshot"("provider", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "B2bSurveyTemplate_version_key" ON "B2bSurveyTemplate"("version");

-- CreateIndex
CREATE INDEX "B2bSurveyTemplate_isActive_version_idx" ON "B2bSurveyTemplate"("isActive", "version");

-- CreateIndex
CREATE INDEX "B2bSurveyResponse_employeeId_updatedAt_idx" ON "B2bSurveyResponse"("employeeId", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bSurveyResponse_templateVersion_updatedAt_idx" ON "B2bSurveyResponse"("templateVersion", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bSurveyAnswer_responseId_questionKey_idx" ON "B2bSurveyAnswer"("responseId", "questionKey");

-- CreateIndex
CREATE INDEX "B2bSurveyAnswer_sectionKey_questionKey_idx" ON "B2bSurveyAnswer"("sectionKey", "questionKey");

-- CreateIndex
CREATE INDEX "B2bAnalysisResult_employeeId_createdAt_idx" ON "B2bAnalysisResult"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "B2bAnalysisResult_employeeId_version_key" ON "B2bAnalysisResult"("employeeId", "version");

-- CreateIndex
CREATE INDEX "B2bPharmacistNote_employeeId_updatedAt_idx" ON "B2bPharmacistNote"("employeeId", "updatedAt");

-- CreateIndex
CREATE INDEX "B2bReport_employeeId_createdAt_idx" ON "B2bReport"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "B2bReport_status_createdAt_idx" ON "B2bReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "B2bReport_employeeId_variantIndex_key" ON "B2bReport"("employeeId", "variantIndex");

-- CreateIndex
CREATE INDEX "B2bEmployeeAccessLog_employeeId_createdAt_idx" ON "B2bEmployeeAccessLog"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "B2bEmployeeAccessLog_appUserId_createdAt_idx" ON "B2bEmployeeAccessLog"("appUserId", "createdAt");

-- CreateIndex
CREATE INDEX "B2bEmployeeAccessLog_action_createdAt_idx" ON "B2bEmployeeAccessLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "B2bAdminActionLog_employeeId_createdAt_idx" ON "B2bAdminActionLog"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "B2bAdminActionLog_action_createdAt_idx" ON "B2bAdminActionLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "B2bEmployee" ADD CONSTRAINT "B2bEmployee_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bHealthDataSnapshot" ADD CONSTRAINT "B2bHealthDataSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bSurveyResponse" ADD CONSTRAINT "B2bSurveyResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bSurveyResponse" ADD CONSTRAINT "B2bSurveyResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "B2bSurveyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bSurveyAnswer" ADD CONSTRAINT "B2bSurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "B2bSurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bAnalysisResult" ADD CONSTRAINT "B2bAnalysisResult_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bPharmacistNote" ADD CONSTRAINT "B2bPharmacistNote_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bReport" ADD CONSTRAINT "B2bReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bEmployeeAccessLog" ADD CONSTRAINT "B2bEmployeeAccessLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bEmployeeAccessLog" ADD CONSTRAINT "B2bEmployeeAccessLog_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bAdminActionLog" ADD CONSTRAINT "B2bAdminActionLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "B2bEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

