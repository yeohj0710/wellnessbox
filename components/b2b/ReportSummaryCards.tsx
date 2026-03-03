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
  buildFriendlyAnalysisLines,
  buildFriendlyRiskLines,
  buildHealthInsightLines,
  clampPercent,
  ensureSentence,
  formatMetricValue,
  resolveHealthScoreLabel,
  resolveMetricStatusLabel,
  sanitizeTitle,
  softenAdviceTone,
  toTrimmedText,
} from "./report-summary/card-insights";

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const RADAR_SIZE = 212;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 70;

const MAX_PAGE1_SECTION_BARS = 3;
const MAX_PAGE2_METRIC_ITEMS = 12;

type AxisItem = {
  id: string;
  label: string;
  score: number;
};

function toMedicationMetaDate(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function buildMedicationMetaLine(input: {
  date: string;
  hospitalName: string;
}) {
  const parts = [input.date, input.hospitalName].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

function radarPoint(index: number, total: number, scale: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
  const x = RADAR_CENTER + RADAR_RADIUS * scale * Math.cos(angle);
  const y = RADAR_CENTER + RADAR_RADIUS * scale * Math.sin(angle);
  return { x, y };
}

function polygonPoints(values: number[], denominator = 100) {
  const total = Math.max(1, values.length);
  return values
    .map((value, index) => {
      const point = radarPoint(index, total, clampPercent(value) / denominator);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
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

  const axes: AxisItem[] = ensureArray(wellness?.lifestyleRisk?.domains)
    .map((axis) => ({
      id: firstOrDash(axis?.id),
      label: sanitizeTitle(firstOrDash(axis?.name || axis?.id)),
      score: clampPercent(axis?.percent),
    }))
    .slice(0, 4);

  const radarAxes =
    axes.length > 0
      ? axes
      : [
          { id: "diet", label: "식습관", score: 0 },
          { id: "immune", label: "면역관리", score: 0 },
          { id: "sleep", label: "수면", score: 0 },
          { id: "activity", label: "활동량", score: 0 },
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

  const sectionNeedsForPage1 = sectionNeeds.slice(0, MAX_PAGE1_SECTION_BARS);
  const hiddenSectionNeedCount = Math.max(0, sectionNeeds.length - sectionNeedsForPage1.length);

  const analysisLines = hasWellnessScoringData ? buildFriendlyAnalysisLines(payload) : [];
  const riskLines = hasWellnessScoringData ? buildFriendlyRiskLines(payload) : [];

  const healthMetricsAll = ensureArray(payload.health?.coreMetrics)
    .map((row) => ({
      label: sanitizeTitle(firstOrDash(row?.label)),
      value: formatMetricValue(row?.value, row?.unit),
      statusLabel: resolveMetricStatusLabel(row?.status),
    }));
  const healthMetrics = healthMetricsAll.slice(0, MAX_PAGE2_METRIC_ITEMS);
  const hiddenHealthMetricCount = Math.max(0, healthMetricsAll.length - healthMetrics.length);

  const healthInsightLines = buildHealthInsightLines(payload);

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
          </article>

          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>생활습관 위험도</h3>
            </div>
            <div className={styles.radarWrap}>
              <svg
                className={styles.radarSvg}
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                role="img"
                aria-label="생활습관 위험도 레이더 차트"
              >
                {[25, 50, 75, 100].map((level) => (
                  <polygon
                    key={`grid-${level}`}
                    points={polygonPoints(radarAxes.map(() => level))}
                    className={styles.radarGrid}
                  />
                ))}
                {radarAxes.map((axis, index) => {
                  const point = radarPoint(index, radarAxes.length, 1);
                  return (
                    <line
                      key={`axis-${axis.id}`}
                      x1={RADAR_CENTER}
                      y1={RADAR_CENTER}
                      x2={point.x}
                      y2={point.y}
                      className={styles.radarAxis}
                    />
                  );
                })}
                <polygon
                  points={polygonPoints(radarAxes.map((axis) => axis.score))}
                  className={styles.radarArea}
                />
                {radarAxes.map((axis, index) => {
                  const point = radarPoint(index, radarAxes.length, axis.score / 100);
                  return (
                    <circle
                      key={`point-${axis.id}`}
                      cx={point.x}
                      cy={point.y}
                      r={3.6}
                      className={styles.radarPoint}
                    />
                  );
                })}
                {radarAxes.map((axis, index) => {
                  const point = radarPoint(index, radarAxes.length, 1.18);
                  return (
                    <text
                      key={`label-${axis.id}`}
                      x={point.x}
                      y={point.y}
                      textAnchor="middle"
                      className={styles.radarLabel}
                    >
                      {axis.label}
                    </text>
                  );
                })}
              </svg>
            </div>
            <p className={styles.inlineHint}>
              종합 위험도:{" "}
              <span className={styles.riskScoreText}>{toScoreLabel(lifestyleOverall)}</span>
            </p>
          </article>

          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>건강관리 위험도</h3>
            </div>
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
                  {line.text}
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
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </section>

      </section>

      <section className={`${styles.reportSheet} ${styles.reportSheetSecond}`} data-report-page="2">
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>2페이지 상세 데이터</p>
          <h2 className={styles.reportPageTitle}>건강검진 데이터 · 진료/조제 이력 · 약사 코멘트</h2>
          <p className={styles.reportPageSubtitle}>
            건강검진 수치, 진료/조제 이력, 약사 의견을 함께 보고 다음 관리 방향을 정리합니다.
          </p>
        </header>

        <div className={styles.reportSecondStack}>
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>건강검진 핵심 수치</h3>
              {hiddenHealthMetricCount > 0 ? (
                <span className={styles.inlineHint}>추가 {hiddenHealthMetricCount}개 수치는 원본에서 확인</span>
              ) : null}
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
            {healthInsightLines.length === 0 ? (
              <p className={styles.reportDataEmpty}>해석 가능한 건강검진 데이터가 충분하지 않습니다.</p>
            ) : (
              <ul className={styles.reportFriendlyList}>
                {healthInsightLines.map((line, index) => (
                  <li key={`insight-${index}`} className={styles.reportFriendlyItem}>
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>최근 진료·조제 이력 상세</h3>
            </div>
            {medicationStatusMessage ? (
              <p className={styles.reportBlockLead}>{ensureSentence(medicationStatusMessage)}</p>
            ) : null}
            {medications.length === 0 ? (
              <p className={styles.reportDataEmpty}>최근 진료/조제 이력이 없습니다.</p>
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
                <strong>권장사항</strong> {pharmacistRecommendations}
              </p>
            ) : null}
            {pharmacistCautions ? (
              <p className={styles.reportDataBody}>
                <strong>주의사항</strong> {pharmacistCautions}
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
    </div>
  );
}
