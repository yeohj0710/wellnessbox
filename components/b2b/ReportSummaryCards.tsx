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

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const RADAR_SIZE = 212;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 70;

const MAX_PAGE1_SECTION_BARS = 3;
const MAX_ANALYSIS_LINES = 3;
const MAX_RISK_LINES = 4;
const MAX_METRICS_LINES = 6;
const MAX_MEDICATION_LINES = 4;

type AxisItem = {
  id: string;
  label: string;
  score: number;
};

type AnalysisCandidate = {
  sectionId: string;
  sectionTitle: string;
  sectionPercent: number;
  questionNumber: number;
  questionScore: number;
  text: string;
};

type RiskCandidate = {
  category: "detailed" | "common" | "domain" | "section";
  title: string;
  score: number;
  action: string;
  questionNumber: number;
};

function clampPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toPercentScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 1) return clampPercent(value * 100);
  return clampPercent(value);
}

function toTrimmedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureSentence(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
}

function shortenLine(text: string, maxLength = 110) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function stripQuestionAndScoreTokens(text: string) {
  return text
    .replace(/\bS\d{2}_Q\d{2}\b/gi, " ")
    .replace(/\bQ\s*\d+\b/gi, " ")
    .replace(/\b[CS]\d{1,2}\b/gi, " ")
    .replace(/점수\s*\(?\d+\s*점\)?/g, " ")
    .replace(/\(\s*\d+\s*점\s*\)/g, " ")
    .replace(/\[\s*(상세|공통|생활습관 축|선택 영역)\s*\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeTitle(text: string) {
  return stripQuestionAndScoreTokens(text).replace(/^[\-:|/,\s]+|[\-:|/,\s]+$/g, "");
}

function softenAdviceTone(text: string) {
  let updated = stripQuestionAndScoreTokens(text);
  const replacements: Array<[RegExp, string]> = [
    [/권장합니다/g, "도움이 됩니다"],
    [/추천합니다/g, "추천드려요"],
    [/필요합니다/g, "챙겨보면 좋습니다"],
    [/점검해 주세요/g, "한 번 살펴보세요"],
    [/확인해 주세요/g, "확인해보세요"],
    [/조정해 주세요/g, "조정해보세요"],
    [/관리해 주세요/g, "관리해보세요"],
    [/줄이세요/g, "줄여보세요"],
    [/드세요/g, "드셔보세요"],
  ];
  for (const [pattern, replacement] of replacements) {
    updated = updated.replace(pattern, replacement);
  }
  return ensureSentence(updated);
}

function resolveHealthScoreLabel(value: number | null) {
  if (value == null) return { valueText: "-", unitText: "" };
  return { valueText: String(Math.round(clampPercent(value))), unitText: "점" };
}

function extractAnalysisCandidates(payload: ReportSummaryPayload): AnalysisCandidate[] {
  const sectionAdvice = payload.analysis?.wellness?.sectionAdvice ?? {};
  const sectionScoreMap = new Map(
    ensureArray(payload.analysis?.wellness?.healthManagementNeed?.sections).map((section) => [
      section?.sectionId || "",
      clampPercent(section?.percent),
    ])
  );

  const rows: AnalysisCandidate[] = [];
  for (const [sectionId, row] of Object.entries(sectionAdvice)) {
    const sectionTitle =
      typeof row?.sectionTitle === "string" && row.sectionTitle.trim().length > 0
        ? row.sectionTitle.trim()
        : sectionId;
    const sectionPercent = sectionScoreMap.get(sectionId) ?? 0;

    for (const item of ensureArray(row?.items)) {
      const questionNumber =
        typeof item?.questionNumber === "number" ? item.questionNumber : Number.NaN;
      const questionScore = toPercentScore(item?.score);
      const text = toTrimmedText(item?.text);
      if (!Number.isFinite(questionNumber) || questionScore == null || !text) continue;
      if (questionScore < 50) continue;
      rows.push({
        sectionId,
        sectionTitle,
        sectionPercent,
        questionNumber,
        questionScore,
        text,
      });
    }
  }

  return rows.sort((left, right) => {
    if (right.questionScore !== left.questionScore) {
      return right.questionScore - left.questionScore;
    }
    if (right.sectionPercent !== left.sectionPercent) {
      return right.sectionPercent - left.sectionPercent;
    }
    if (left.questionNumber !== right.questionNumber) {
      return left.questionNumber - right.questionNumber;
    }
    return left.sectionTitle.localeCompare(right.sectionTitle);
  });
}

function pickBalancedAnalysisLines(candidates: AnalysisCandidate[], maxCount: number) {
  const grouped = new Map<string, AnalysisCandidate[]>();
  for (const row of candidates) {
    const key = `${row.sectionId}|${row.sectionTitle}`;
    const queue = grouped.get(key) ?? [];
    queue.push(row);
    grouped.set(key, queue);
  }

  const orderedKeys = [...grouped.entries()]
    .sort((left, right) => {
      const leftTop = left[1][0];
      const rightTop = right[1][0];
      if (rightTop.questionScore !== leftTop.questionScore) {
        return rightTop.questionScore - leftTop.questionScore;
      }
      if (rightTop.sectionPercent !== leftTop.sectionPercent) {
        return rightTop.sectionPercent - leftTop.sectionPercent;
      }
      return leftTop.sectionTitle.localeCompare(rightTop.sectionTitle);
    })
    .map(([key]) => key);

  const picked: AnalysisCandidate[] = [];
  while (picked.length < maxCount) {
    let hasItem = false;
    for (const key of orderedKeys) {
      const queue = grouped.get(key);
      if (!queue || queue.length === 0) continue;
      picked.push(queue.shift() as AnalysisCandidate);
      hasItem = true;
      if (picked.length >= maxCount) break;
    }
    if (!hasItem) break;
  }
  return picked;
}

function buildFriendlyAnalysisLines(payload: ReportSummaryPayload) {
  const candidates = extractAnalysisCandidates(payload);
  const picked = pickBalancedAnalysisLines(candidates, MAX_ANALYSIS_LINES);
  return picked.map((item) => {
    const sectionTitle = sanitizeTitle(item.sectionTitle) || "선택 영역";
    const text = softenAdviceTone(item.text);
    return {
      key: `${item.sectionId}-${item.questionNumber}`,
      text: shortenLine(`${sectionTitle} 영역은 ${text}`),
    };
  });
}

function extractRiskCandidates(payload: ReportSummaryPayload): RiskCandidate[] {
  const rows = ensureArray(payload.analysis?.wellness?.highRiskHighlights);
  const candidates: RiskCandidate[] = [];

  for (const item of rows) {
    const category = item?.category;
    if (
      category !== "detailed" &&
      category !== "common" &&
      category !== "domain" &&
      category !== "section"
    ) {
      continue;
    }

    const title = sanitizeTitle(toTrimmedText(item?.title));
    const action = softenAdviceTone(toTrimmedText(item?.action));
    if (!action) continue;

    const questionNumber =
      typeof item?.questionNumber === "number" && Number.isFinite(item.questionNumber)
        ? item.questionNumber
        : 999;

    const score = clampPercent(toScoreValue(item?.score));
    if (score < 50) continue;

    candidates.push({
      category,
      title,
      score,
      action,
      questionNumber,
    });
  }

  return candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.questionNumber !== right.questionNumber) return left.questionNumber - right.questionNumber;
    return left.title.localeCompare(right.title);
  });
}

function pickBalancedRiskLines(candidates: RiskCandidate[], maxCount: number) {
  const selected: RiskCandidate[] = [];
  const selectedCategory = new Set<RiskCandidate["category"]>();

  for (const row of candidates) {
    if (selectedCategory.has(row.category)) continue;
    selected.push(row);
    selectedCategory.add(row.category);
    if (selected.length >= maxCount) return selected;
  }

  for (const row of candidates) {
    if (selected.some((item) => item.category === row.category && item.title === row.title)) continue;
    selected.push(row);
    if (selected.length >= maxCount) break;
  }

  return selected;
}

function riskLead(category: RiskCandidate["category"], title: string) {
  if (category === "detailed") {
    return title ? `${title} 항목은` : "우선 조정이 필요한 항목은";
  }
  if (category === "common") {
    return title ? `생활 습관 중 ${title} 부분은` : "생활 습관에서는";
  }
  if (category === "domain") {
    return title ? `${title} 축은` : "생활 습관 축에서는";
  }
  return title ? `${title} 영역은` : "선택 영역에서는";
}

function buildFriendlyRiskLines(payload: ReportSummaryPayload) {
  const candidates = extractRiskCandidates(payload);
  const picked = pickBalancedRiskLines(candidates, MAX_RISK_LINES);
  return picked.map((item) => {
    const merged = ensureSentence(`${riskLead(item.category, item.title)} ${item.action}`);
    return {
      key: `${item.category}-${item.title || item.questionNumber}`,
      text: shortenLine(merged),
    };
  });
}

function formatMetricValue(value?: string, unit?: string | null) {
  const base = toTrimmedText(value);
  if (!base) return "-";
  const normalizedUnit = toTrimmedText(unit);
  if (!normalizedUnit) return base;
  if (base.toLowerCase().includes(normalizedUnit.toLowerCase())) return base;
  return `${base} ${normalizedUnit}`;
}

function resolveMetricStatusLabel(status?: string) {
  const normalized = toTrimmedText(status).toLowerCase();
  if (normalized === "high") return "주의";
  if (normalized === "low") return "주의";
  if (normalized === "caution") return "관찰";
  if (normalized === "normal") return "정상";
  return "안정";
}

function buildHealthInsightLines(payload: ReportSummaryPayload) {
  const metrics = ensureArray(payload.health?.coreMetrics);
  const flagged = metrics
    .filter((row) => {
      const status = toTrimmedText(row?.status).toLowerCase();
      return status === "high" || status === "low" || status === "caution";
    })
    .slice(0, 3);

  const recommendations = ensureArray(payload.analysis?.recommendations)
    .map((row) => softenAdviceTone(toTrimmedText(row)))
    .filter(Boolean)
    .slice(0, 2);

  const lines: string[] = [];
  if (flagged.length === 0) {
    lines.push("최근 검진 수치에서 큰 이상 신호는 많지 않습니다. 현재 루틴을 꾸준히 유지해보세요.");
  } else {
    for (const metric of flagged) {
      const label = firstOrDash(metric?.label);
      const value = formatMetricValue(metric?.value, metric?.unit);
      lines.push(`${label} 수치가 ${value}로 확인되어, 생활 루틴을 조금 더 꼼꼼히 챙겨보세요.`);
    }
  }

  for (const recommendation of recommendations) {
    lines.push(recommendation);
  }

  return lines.slice(0, 4).map((line) => shortenLine(line));
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

  const healthMetrics = ensureArray(payload.health?.coreMetrics)
    .map((row) => ({
      label: sanitizeTitle(firstOrDash(row?.label)),
      value: formatMetricValue(row?.value, row?.unit),
      statusLabel: resolveMetricStatusLabel(row?.status),
    }))
    .slice(0, MAX_METRICS_LINES);

  const healthInsightLines = buildHealthInsightLines(payload);

  const medications = ensureArray(payload.health?.medications)
    .map((row) => ({
      medicationName: sanitizeTitle(firstOrDash(row?.medicationName)),
      hospitalName: sanitizeTitle(firstOrDash(row?.hospitalName)),
      date: firstOrDash(row?.date),
      dosageDay: firstOrDash(row?.dosageDay),
    }))
    .slice(0, MAX_MEDICATION_LINES);

  const medicationStatusMessage = toTrimmedText(payload.health?.medicationStatus?.message);

  const pharmacistSummary = softenAdviceTone(toTrimmedText(payload.pharmacist?.summary));
  const pharmacistRecommendations = softenAdviceTone(
    toTrimmedText(payload.pharmacist?.recommendations)
  );
  const pharmacistCautions = softenAdviceTone(toTrimmedText(payload.pharmacist?.cautions));

  return (
    <div className={styles.reportDocument}>
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
              <p className={styles.inlineHint}>점수 높을수록 좋음</p>
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
              건강점수 = 100 - ((생활습관 위험도 + 건강관리 필요도 평균) / 2)
            </p>
          </article>

          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>생활습관 위험도</h3>
              <p className={styles.inlineHint}>점수 높을수록 안 좋음</p>
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
            <p className={styles.inlineHint}>종합 위험도: {toScoreLabel(lifestyleOverall)}</p>
          </article>

          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>건강관리 필요도</h3>
              <p className={styles.inlineHint}>점수 높을수록 안 좋음</p>
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
            <p className={styles.inlineHint}>평균 필요도: {toScoreLabel(healthNeedAverage)}</p>
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
                : "점수 계산 가능한 설문 응답이 부족해 분석 멘트를 생성하지 않았습니다."}
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
                : "점수 계산 가능한 설문 응답이 부족해 고위험 항목을 생성하지 않았습니다."}
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

        <p className={styles.reportFooterNote}>
          위 항목은 오늘부터 바로 적용 가능한 변화 중심으로 정리되어 있습니다.
        </p>
      </section>

      <section className={`${styles.reportSheet} ${styles.reportSheetSecond}`} data-report-page="2">
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>2페이지 상세 데이터</p>
          <h2 className={styles.reportPageTitle}>건강검진 데이터 · 복약 이력 · 약사 코멘트</h2>
          <p className={styles.reportPageSubtitle}>
            건강검진 수치, 복약 상태, 약사 의견을 함께 보고 다음 관리 방향을 정리합니다.
          </p>
        </header>

        <div className={styles.reportSecondGrid}>
          <article className={styles.reportDataCard}>
            <h3 className={styles.reportDataTitle}>건강검진 핵심 수치</h3>
            {healthMetrics.length === 0 ? (
              <p className={styles.reportDataEmpty}>확인 가능한 건강검진 핵심 수치가 없습니다.</p>
            ) : (
              <ul className={styles.reportDataList}>
                {healthMetrics.map((metric, index) => (
                  <li key={`metric-${index}`} className={styles.reportDataBody}>
                    <span className={styles.reportDataLabel}>{metric.label}</span>
                    <span className={styles.reportDataValue}>{metric.value}</span>
                    <span className={styles.reportInsightBadge}>{metric.statusLabel}</span>
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
            <h3 className={styles.reportDataTitle}>복약 이력 분석</h3>
            {medicationStatusMessage ? (
              <p className={styles.reportBlockLead}>{ensureSentence(medicationStatusMessage)}</p>
            ) : null}
            {medications.length === 0 ? (
              <p className={styles.reportDataEmpty}>최근 복약 이력이 없습니다.</p>
            ) : (
              <ul className={styles.reportDataList}>
                {medications.map((medication, index) => (
                  <li key={`medication-${index}`} className={styles.reportDataBody}>
                    <span className={styles.reportDataLabel}>{medication.medicationName}</span>
                    <span className={styles.reportDataValue}>
                      {medication.date} / {medication.dosageDay}
                    </span>
                    <span className={styles.inlineHint}>{medication.hospitalName}</span>
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
            <p className={styles.inlineHint}>
              다음 버전에서는 추천 영양제의 성분/제품 정보가 이 페이지에 추가될 예정입니다.
            </p>
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
