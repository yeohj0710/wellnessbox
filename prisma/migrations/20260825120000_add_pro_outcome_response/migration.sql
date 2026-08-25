-- 복용 전후 환자보고결과(PRO) 수집 테이블. KPI-2(효과 개선도 SCGI) 측정의 원천이다.
-- 새 테이블만 만들고 기존 테이블은 건드리지 않는다.

CREATE TYPE "ProOutcomePhase" AS ENUM ('BASELINE', 'FOLLOWUP');

CREATE TABLE "ProOutcomeResponse" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participantToken" TEXT NOT NULL,
    "phase" "ProOutcomePhase" NOT NULL,
    "goalKey" TEXT NOT NULL,
    "goalScore" INTEGER NOT NULL,
    "generalScore" INTEGER NOT NULL,
    "sleepScore" INTEGER NOT NULL,
    "digestionScore" INTEGER NOT NULL,
    "energyScore" INTEGER NOT NULL,
    "daysTaken" INTEGER,
    "adherencePercent" INTEGER,
    "note" TEXT,
    "researchConsented" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT,
    "clientId" TEXT,
    "appUserId" TEXT,
    "orderId" TEXT,
    "excludedReason" TEXT,

    CONSTRAINT "ProOutcomeResponse_pkey" PRIMARY KEY ("id")
);

-- 한 참여자는 단계마다 한 번만 답한다. 재제출은 갱신으로 처리한다.
CREATE UNIQUE INDEX "ProOutcomeResponse_participantToken_phase_key"
    ON "ProOutcomeResponse"("participantToken", "phase");

CREATE INDEX "ProOutcomeResponse_submittedAt_idx" ON "ProOutcomeResponse"("submittedAt");
CREATE INDEX "ProOutcomeResponse_phase_researchConsented_idx"
    ON "ProOutcomeResponse"("phase", "researchConsented");
CREATE INDEX "ProOutcomeResponse_goalKey_idx" ON "ProOutcomeResponse"("goalKey");
