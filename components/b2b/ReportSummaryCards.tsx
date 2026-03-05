"use client";

import styles from "./B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  ensureArray,
  firstOrDash,
  formatDate,
  toScoreLabel,
  toScoreValue,
} from "./report-summary/helpers";
import {
  buildDetailedRiskHighlightLines,
  buildDetailedSectionAdviceLines,
  buildFriendlyAnalysisLines,
  buildFriendlyRiskLines,
  clampPercent,
  ensureSentence,
  formatMetricValue,
  resolveHealthScoreLabel,
  resolveMetricStatusLabel,
  sanitizeTitle,
  softenAdviceTone,
  toTrimmedText,
} from "./report-summary/card-insights";
import SurveyDetailPages from "./report-summary/SurveyDetailPages";

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const MAX_PAGE1_SECTION_BARS = 3;
const RISK_CHUNK_SIZE = 5;
const ROUTINE_CHUNK_SIZE = 6;
const SECTION_ADVICE_CHUNK_SIZE = 6;
const SUPPLEMENT_CHUNK_SIZE = 2;

const LIFESTYLE_RISK_LABEL_BY_ID: Record<string, string> = {
  diet: "식습관 위험도",
  activity: "활동량 위험도",
  immune: "면역관리 위험도",
  sleep: "수면 위험도",
};

const LIFESTYLE_RISK_BASE_LABEL_BY_NAME: Record<string, string> = {
  식습관: "식습관",
  활동량: "활동량",
  면역관리: "면역관리",
  수면: "수면",
};

function toMedicationMetaDate(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return text;
}

function buildMedicationMetaLine(input: {
  date: string;
  hospitalName: string;
}) {
  const parts = [input.date, input.hospitalName].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

function toLifestyleRiskLabel(input: { id?: string; label?: string }) {
  const normalizedId = toTrimmedText(input.id).toLowerCase();
  if (normalizedId && LIFESTYLE_RISK_LABEL_BY_ID[normalizedId]) {
    return LIFESTYLE_RISK_LABEL_BY_ID[normalizedId];
  }

  const rawLabel = sanitizeTitle(toTrimmedText(input.label || input.id));
  const collapsed = rawLabel.replace(/\s+/g, "");
  const mapped = LIFESTYLE_RISK_BASE_LABEL_BY_NAME[collapsed] || rawLabel || "생활습관";
  const withoutSuffix = mapped.endsWith("위험도") ? mapped.slice(0, -3).trim() : mapped;
  return `${withoutSuffix} 위험도`;
}

function chunkItems<T>(items: T[], chunkSize: number) {
  if (items.length === 0) return [] as T[][];
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += safeChunkSize) {
    chunks.push(items.slice(index, index + safeChunkSize));
  }
  return chunks;
}

export default function ReportSummaryCards(props: {
  payload: ReportSummaryPayload | null | undefined;
  viewerMode?: "employee" | "admin";
}) {
  const payload = props.payload;
  const viewerMode = props.viewerMode ?? "admin";

  if (!payload) {
    return (
      <section className={styles.sectionCard}>
        <p className={styles.inlineHint}>아직 생성된 리포트 데이터가 없습니다.</p>
      </section>
    );
  }

  const wellness = payload.analysis?.wellness;
  const commonQuestionScores = wellness?.perQuestionScores?.common ?? {};
  const sectionScoreMaps = wellness?.perQuestionScores?.sections ?? {};

  const lifestyleAnsweredCount = Object.entries(commonQuestionScores).filter(
    ([questionId, score]) =>
      /^C(1[0-9]|2[0-6])$/.test(questionId) &&
      typeof score === "number" &&
      Number.isFinite(score)
  ).length;
  const sectionAnsweredCount = Object.values(sectionScoreMaps).reduce((sum, sectionMap) => {
    return (
      sum +
      Object.values(sectionMap ?? {}).filter(
        (score) => typeof score === "number" && Number.isFinite(score)
      ).length
    );
  }, 0);

  const hasWellnessScoringData = lifestyleAnsweredCount > 0 || sectionAnsweredCount > 0;

  const healthScore = hasWellnessScoringData
    ? toScoreValue(
        wellness?.overallHealthScore ?? payload.analysis?.summary?.overallScore ?? null
      )
    : null;
  const lifestyleOverall = hasWellnessScoringData
    ? toScoreValue(wellness?.lifestyleRisk?.overallPercent ?? null)
    : null;
  const healthNeedAverage = hasWellnessScoringData
    ? toScoreValue(wellness?.healthManagementNeed?.averagePercent ?? null)
    : null;

  const donutOffset =
    healthScore == null
      ? DONUT_CIRCUMFERENCE
      : DONUT_CIRCUMFERENCE * (1 - clampPercent(healthScore) / 100);

  const resolvedHealthScore = resolveHealthScoreLabel(healthScore);

  const lifestyleRiskAxes = ensureArray(wellness?.lifestyleRisk?.domains)
    .map((axis) => ({
      id: firstOrDash(axis?.id),
      label: toLifestyleRiskLabel({
        id: firstOrDash(axis?.id),
        label: firstOrDash(axis?.name || axis?.id),
      }),
      score: clampPercent(axis?.percent),
    }))
    .slice(0, 4);

  const resolvedLifestyleRiskAxes =
    lifestyleRiskAxes.length > 0
      ? lifestyleRiskAxes
      : [
          { id: "diet", label: "식습관 위험도", score: 0 },
          { id: "activity", label: "활동량 위험도", score: 0 },
          { id: "immune", label: "면역관리 위험도", score: 0 },
          { id: "sleep", label: "수면 위험도", score: 0 },
        ];

  const sectionNeeds = ensureArray(wellness?.healthManagementNeed?.sections)
    .map((section) => ({
      sectionId: firstOrDash(section?.sectionId),
      sectionTitle: sanitizeTitle(firstOrDash(section?.sectionTitle || section?.sectionId)),
      percent: clampPercent(section?.percent),
    }))
    .sort((left, right) => {
      if (right.percent !== left.percent) return right.percent - left.percent;
      return left.sectionId.localeCompare(right.sectionId);
    });
  const sectionTitleById = new Map(
    sectionNeeds
      .filter((row) => row.sectionId.length > 0 && row.sectionId !== "-")
      .map((row) => [row.sectionId, row.sectionTitle] as const)
  );

  const sectionNeedsForPage1 = sectionNeeds.slice(0, MAX_PAGE1_SECTION_BARS);
  const hiddenSectionNeedCount = Math.max(0, sectionNeeds.length - sectionNeedsForPage1.length);
  const centerNeedCardContent =
    sectionNeedsForPage1.length > 0 && sectionNeedsForPage1.length < MAX_PAGE1_SECTION_BARS;

  const analysisLines = hasWellnessScoringData ? buildFriendlyAnalysisLines(payload) : [];
  const riskLines = hasWellnessScoringData ? buildFriendlyRiskLines(payload) : [];
  const detailedRiskLines = hasWellnessScoringData
    ? buildDetailedRiskHighlightLines(payload, Number.POSITIVE_INFINITY)
    : [];
  const detailedSectionAdviceLines = hasWellnessScoringData
    ? buildDetailedSectionAdviceLines(payload, Number.POSITIVE_INFINITY)
    : [];
  const lifestyleRoutineAdviceLines = hasWellnessScoringData
    ? ensureArray(wellness?.lifestyleRoutineAdvice)
        .map((item) => ensureSentence(toTrimmedText(item)))
        .filter(Boolean)
    : [];
  const supplementDesignRows = hasWellnessScoringData
    ? ensureArray(wellness?.supplementDesign).map((item) => ({
        sectionId: firstOrDash(item?.sectionId),
        sectionTitle:
          sectionTitleById.get(firstOrDash(item?.sectionId)) ||
          sanitizeTitle(firstOrDash(item?.sectionId)),
        title: sanitizeTitle(firstOrDash(item?.title)),
        paragraphs: ensureArray(item?.paragraphs)
          .map((paragraph) => ensureSentence(toTrimmedText(paragraph)))
          .filter(Boolean),
        recommendedNutrients: ensureArray(item?.recommendedNutrients)
          .map((nutrient) => sanitizeTitle(firstOrDash(nutrient?.labelKo || nutrient?.label)))
          .filter(Boolean),
      }))
    : [];

  const riskPages = chunkItems(detailedRiskLines, RISK_CHUNK_SIZE);
  const routinePages = chunkItems(lifestyleRoutineAdviceLines, ROUTINE_CHUNK_SIZE);
  const combinedSurveyPageCount = Math.max(riskPages.length, routinePages.length);
  const sectionAdvicePages = chunkItems(detailedSectionAdviceLines, SECTION_ADVICE_CHUNK_SIZE);
  const supplementPages = chunkItems(supplementDesignRows, SUPPLEMENT_CHUNK_SIZE);
  const surveyDetailPageStart = 4;
  const sectionAdvicePageStart = surveyDetailPageStart + combinedSurveyPageCount;
  const supplementPageStart = sectionAdvicePageStart + sectionAdvicePages.length;

  const coreMetricStatusByLabel = new Map(
    ensureArray(payload.health?.coreMetrics)
      .map((row) => ({
        label: sanitizeTitle(firstOrDash(row?.label)),
        statusLabel: resolveMetricStatusLabel(row?.status),
      }))
      .filter((row) => row.label.length > 0)
      .map((row) => [row.label, row.statusLabel] as const)
  );
  const rawHealthMetrics = ensureArray(payload.health?.metrics);
  const healthMetrics =
    rawHealthMetrics.length > 0
      ? rawHealthMetrics.map((row) => {
          const label = sanitizeTitle(firstOrDash(row?.metric));
          return {
            label,
            value: formatMetricValue(row?.value, row?.unit),
            statusLabel: coreMetricStatusByLabel.get(label) ?? "참고",
          };
        })
      : ensureArray(payload.health?.coreMetrics).map((row) => ({
          label: sanitizeTitle(firstOrDash(row?.label)),
          value: formatMetricValue(row?.value, row?.unit),
          statusLabel: resolveMetricStatusLabel(row?.status),
        }));

  const healthInsightEmptyMessage = "내용이 없습니다.";

  const medicationsAll = ensureArray(payload.health?.medications)
    .map((row) => ({
      medicationName: sanitizeTitle(firstOrDash(row?.medicationName)),
      hospitalName: sanitizeTitle(toTrimmedText(row?.hospitalName)),
      date: toMedicationMetaDate(row?.date),
    }));
  const medications = medicationsAll;

  const medicationStatusMessage = toTrimmedText(payload.health?.medicationStatus?.message);

  const pharmacistSummary = softenAdviceTone(toTrimmedText(payload.pharmacist?.summary));
  const pharmacistRecommendations = softenAdviceTone(
    toTrimmedText(payload.pharmacist?.recommendations)
  );
  const pharmacistCautions = softenAdviceTone(toTrimmedText(payload.pharmacist?.cautions));

  return (
    <div className={styles.reportDocument} data-report-document="1">
      <section className={`${styles.reportSheet} ${styles.reportSheetFirst}`} data-report-page="1">
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>WellnessBox 개인 건강 리포트</p>
          <h2 className={styles.reportPageTitle}>이번 달 건강 상태 요약과 우선 실천 항목</h2>
          <p className={styles.reportPageSubtitle}>
            먼저 전체 점수를 확인하고, 지금 바로 시작할 수 있는 실천 항목을 간단히 정리했습니다.
          </p>
          <div className={styles.reportMetaRow}>
            <span className={styles.reportMetaItem}>대상자: {firstOrDash(payload.meta?.employeeName)}</span>
            <span className={styles.reportMetaItem}>기간: {firstOrDash(payload.meta?.periodKey)}</span>
            <span className={styles.reportMetaItem}>생성: {formatDate(payload.meta?.generatedAt)}</span>
          </div>
        </header>

        <section className={styles.reportTopGrid}>
          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>건강점수</h3>
            </div>
            <div className={styles.reportScoreStack}>
              <div className={styles.donutWrap}>
                <svg
                  viewBox="0 0 140 140"
                  className={styles.donutSvg}
                  role="img"
                  aria-label="건강점수 원형 차트"
                >
                  <circle cx="70" cy="70" r={DONUT_RADIUS} className={styles.donutTrack} />
                  <circle
                    cx="70"
                    cy="70"
                    r={DONUT_RADIUS}
                    className={styles.donutProgress}
                    style={{
                      strokeDasharray: DONUT_CIRCUMFERENCE,
                      strokeDashoffset: donutOffset,
                    }}
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <strong>
                    <span className={styles.scoreValue}>{resolvedHealthScore.valueText}</span>
                    {resolvedHealthScore.unitText ? (
                      <span className={styles.scoreUnit}>{resolvedHealthScore.unitText}</span>
                    ) : null}
                  </strong>
                </div>
              </div>
              <p className={styles.reportFormula}>
                건강점수 = 100 - ((생활습관 위험도 + 건강관리 위험도 평균) / 2)
              </p>
            </div>
          </article>

          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>생활습관 위험도</h3>
            </div>
            <ul className={styles.riskBarList} aria-label="생활습관 위험도 막대 그래프">
              {resolvedLifestyleRiskAxes.map((axis) => (
                <li key={`lifestyle-risk-${axis.id}`} className={styles.riskBarRow}>
                  <div className={styles.riskBarHead}>
                    <span>{axis.label}</span>
                    <strong>{toScoreLabel(axis.score)}</strong>
                  </div>
                  <div className={styles.riskBarTrack}>
                    <div
                      className={styles.riskBarFill}
                      style={{ width: `${clampPercent(axis.score)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.inlineHint}>
              종합 위험도:{" "}
              <span className={styles.riskScoreText}>{toScoreLabel(lifestyleOverall)}</span>
            </p>
          </article>

          <article className={`${styles.reportTopCard} ${styles.reportTopCardNeed}`}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>건강관리 위험도</h3>
            </div>
            <div
              className={`${styles.needCardContent} ${centerNeedCardContent ? styles.needCardContentCentered : ""}`}
            >
              {sectionNeedsForPage1.length === 0 ? (
                <p className={styles.inlineHint}>선택 영역 데이터가 없습니다.</p>
              ) : (
                <ul className={styles.needList}>
                  {sectionNeedsForPage1.map((section) => (
                    <li key={`need-${section.sectionId}`} className={styles.needRow}>
                      <div className={styles.needHead}>
                        <span>{section.sectionTitle}</span>
                        <strong>{toScoreLabel(section.percent)}</strong>
                      </div>
                      <div className={styles.needTrack}>
                        <div
                          className={styles.needFill}
                          style={{ width: `${clampPercent(section.percent)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.inlineHint}>
                평균 위험도:{" "}
                <span className={styles.riskScoreText}>{toScoreLabel(healthNeedAverage)}</span>
              </p>
              {hiddenSectionNeedCount > 0 ? (
                <p className={styles.inlineHint}>추가 영역 {hiddenSectionNeedCount}개는 2페이지에서 확인 가능</p>
              ) : null}
            </div>
          </article>
        </section>

        <section className={styles.reportBlock}>
          <h3 className={styles.reportBlockTitle}>1. 종합 건강 분석 멘트</h3>
          {analysisLines.length === 0 ? (
            <p className={styles.reportDataEmpty}>
              {hasWellnessScoringData
                ? "현재 기준으로는 강조할 핵심 문장을 만들 정보가 충분하지 않습니다."
                : "분석 멘트를 보여줄 데이터가 아직 부족합니다."}
            </p>
          ) : (
            <ul className={styles.reportFriendlyList}>
              {analysisLines.map((line) => (
                <li key={`analysis-${line.key}`} className={styles.reportFriendlyItem}>
                  <p className={styles.reportDataBody}>
                    <strong>문항:</strong> {line.questionText}
                  </p>
                  <p className={styles.reportDataBody}>
                    <strong>내 답변:</strong> {line.answerText || "-"}
                  </p>
                  <p className={styles.reportDataBody}>
                    <strong>권장안:</strong> {line.recommendation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.reportBlock}>
          <h3 className={styles.reportBlockTitle}>2. 주의가 필요한 고위험 항목</h3>
          {riskLines.length === 0 ? (
            <p className={styles.reportDataEmpty}>
              {hasWellnessScoringData
                ? "현재 기준에서 우선 조정이 필요한 고위험 항목은 뚜렷하지 않습니다."
                : "고위험 항목을 안내할 데이터가 아직 부족합니다."}
            </p>
          ) : (
            <ul className={styles.reportFriendlyList}>
              {riskLines.map((line) => (
                <li key={`risk-${line.key}`} className={styles.reportFriendlyItem}>
                  <p className={styles.reportDataBody}>
                    <strong>문항:</strong> {line.questionText}
                  </p>
                  {line.answerText ? (
                    <p className={styles.reportDataBody}>
                      <strong>내 답변:</strong> {line.answerText}
                    </p>
                  ) : null}
                  <p className={styles.reportDataBody}>
                    <strong>권장안:</strong> {line.recommendation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

      </section>

      <section className={`${styles.reportSheet} ${styles.reportSheetSecond}`} data-report-page="2">
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>2페이지 상세 데이터</p>
          <h2 className={styles.reportPageTitle}>건강검진 데이터 상세</h2>
          <p className={styles.reportPageSubtitle}>
            건강검진에서 측정된 지표를 모두 확인하고 현재 상태를 점검합니다.
          </p>
        </header>

        <div className={styles.reportSecondStack}>
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>건강검진 전체 수치</h3>
            </div>
            {healthMetrics.length === 0 ? (
              <p className={styles.reportDataEmpty}>확인 가능한 건강검진 핵심 수치가 없습니다.</p>
            ) : (
              <ul className={styles.reportMetricGrid}>
                {healthMetrics.map((metric, index) => (
                  <li key={`metric-${index}`} className={styles.reportMetricItem}>
                    <div className={styles.reportMetricHead}>
                      <span className={styles.reportMetricLabel}>{metric.label}</span>
                      <span className={styles.reportInsightBadge}>{metric.statusLabel}</span>
                    </div>
                    <span className={styles.reportMetricValue}>{metric.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.reportDataCard}>
            <h3 className={styles.reportDataTitle}>건강검진 데이터 해석</h3>
            <p className={styles.reportDataEmpty}>{healthInsightEmptyMessage}</p>
          </article>
        </div>
      </section>

      <section className={`${styles.reportSheet} ${styles.reportSheetThird}`} data-report-page="3">
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>3페이지 상세 데이터</p>
          <h2 className={styles.reportPageTitle}>복약 이력 · 약사 코멘트</h2>
          <p className={styles.reportPageSubtitle}>
            복약 이력을 기준으로 언제 어떤 약물을 처방·조제받았는지 확인합니다.
          </p>
        </header>

        <div className={styles.reportSecondStack}>
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>복약 이력 상세</h3>
            </div>
            {medicationStatusMessage ? (
              <p className={styles.reportBlockLead}>{ensureSentence(medicationStatusMessage)}</p>
            ) : null}
            {medications.length === 0 ? (
              <p className={styles.reportDataEmpty}>복약 이력이 없습니다.</p>
            ) : (
              <ul className={styles.reportMedicationList}>
                {medications.map((medication, index) => (
                  <li key={`medication-${index}`} className={styles.reportMedicationItem}>
                    <p className={styles.reportMedicationName}>{medication.medicationName}</p>
                    <p className={styles.reportMedicationMeta}>
                      {buildMedicationMetaLine({
                        date: medication.date,
                        hospitalName: medication.hospitalName,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.reportDataCard}>
            <h3 className={styles.reportDataTitle}>약사 코멘트</h3>
            {pharmacistSummary ? (
              <p className={styles.reportBlockLead}>{pharmacistSummary}</p>
            ) : (
              <p className={styles.reportDataEmpty}>등록된 약사 코멘트가 없습니다.</p>
            )}
            {pharmacistRecommendations ? (
              <p className={styles.reportDataBody}>
                <strong>권장사항:</strong> {pharmacistRecommendations}
              </p>
            ) : null}
            {pharmacistCautions ? (
              <p className={styles.reportDataBody}>
                <strong>주의사항:</strong> {pharmacistCautions}
              </p>
            ) : null}
          </article>
        </div>

        <section className={styles.metaFooter}>
          {viewerMode === "admin" ? (
            <>
              생성 시각: {formatDate(payload.meta?.generatedAt)} / 대상자:{" "}
              {firstOrDash(payload.meta?.employeeName)} / 기간:{" "}
              {firstOrDash(payload.meta?.periodKey)}
              {payload.meta?.isMockData ? " / 데모 데이터" : ""}
            </>
          ) : (
            <>
              대상자: {firstOrDash(payload.meta?.employeeName)} / 기간:{" "}
              {firstOrDash(payload.meta?.periodKey)}
            </>
          )}
        </section>
      </section>

      <SurveyDetailPages
        combinedSurveyPageCount={combinedSurveyPageCount}
        surveyDetailPageStart={surveyDetailPageStart}
        riskPages={riskPages}
        routinePages={routinePages}
        sectionAdvicePageStart={sectionAdvicePageStart}
        sectionAdvicePages={sectionAdvicePages}
        supplementPageStart={supplementPageStart}
        supplementPages={supplementPages}
      />
    </div>
  );
}
