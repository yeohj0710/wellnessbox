-- 이상반응 신고 수집 테이블. KPI-6(연 5건 이하) 집계의 원천이다.
-- 새 테이블만 만들고 기존 테이블은 건드리지 않는다.

CREATE TYPE "AdverseEventSeverity" AS ENUM ('MILD', 'MODERATE', 'SERIOUS');

CREATE TYPE "AdverseEventReportStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED');

CREATE TABLE "AdverseEventReport" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    "appUserId" TEXT,
    "productName" TEXT NOT NULL,
    "symptomText" TEXT NOT NULL,
    "severity" "AdverseEventSeverity" NOT NULL,
    "onsetAt" TIMESTAMP(3),
    "stillTaking" BOOLEAN NOT NULL DEFAULT false,
    "relatedToRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "privacyConsented" BOOLEAN NOT NULL DEFAULT false,
    "status" "AdverseEventReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "forwardedToRndAt" TIMESTAMP(3),
    "rndCaseId" TEXT,

    CONSTRAINT "AdverseEventReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdverseEventReport_rndCaseId_key" ON "AdverseEventReport"("rndCaseId");

CREATE INDEX "AdverseEventReport_submittedAt_idx" ON "AdverseEventReport"("submittedAt");

CREATE INDEX "AdverseEventReport_severity_status_idx" ON "AdverseEventReport"("severity", "status");

CREATE INDEX "AdverseEventReport_relatedToRecommendation_submittedAt_idx" ON "AdverseEventReport"("relatedToRecommendation", "submittedAt");
