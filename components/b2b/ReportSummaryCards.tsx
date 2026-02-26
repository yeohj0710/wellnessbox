"use client";

import styles from "./B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { ensureArray, firstOrDash, formatDate, toScoreLabel, toScoreValue } from "./report-summary/helpers";

const DONUT_RADIUS = 54;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const RADAR_SIZE = 220;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 72;
const MAX_ANALYSIS_LINES = 6;
const MAX_RISK_LINES = 6;

type AxisItem = {
  id: string;
  label: string;
  score: number;
};

type AnalysisLine = {
  sectionTitle: string;
  questionNumber: number;
  sectionPercent: number;
  text: string;
};

function clampPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeSectionAdvice(payload: ReportSummaryPayload): AnalysisLine[] {
  const sectionAdvice = payload.analysis?.wellness?.sectionAdvice ?? {};
  const sectionScoreMap = new Map(
    ensureArray(payload.analysis?.wellness?.healthManagementNeed?.sections).map((section) => [
      section?.sectionId || "",
      clampPercent(section?.percent),
    ])
  );

  const rows: AnalysisLine[] = [];
  for (const [sectionId, row] of Object.entries(sectionAdvice)) {
    const sectionTitle =
      typeof row?.sectionTitle === "string" && row.sectionTitle.trim().length > 0
        ? row.sectionTitle.trim()
        : sectionId;
    const sectionPercent = sectionScoreMap.get(sectionId) ?? 0;
    for (const item of ensureArray(row?.items)) {
      const questionNumber =
        typeof item?.questionNumber === "number" ? item.questionNumber : Number.NaN;
      const text = typeof item?.text === "string" ? item.text.trim() : "";
      if (!Number.isFinite(questionNumber) || !text) continue;
      rows.push({ sectionTitle, questionNumber, sectionPercent, text });
    }
  }
  return rows
    .sort((left, right) => {
      if (right.sectionPercent !== left.sectionPercent) return right.sectionPercent - left.sectionPercent;
      if (left.sectionTitle !== right.sectionTitle) return left.sectionTitle.localeCompare(right.sectionTitle);
      return left.questionNumber - right.questionNumber;
    })
    .slice(0, MAX_ANALYSIS_LINES);
}

function buildRiskLines(payload: ReportSummaryPayload) {
  const lines: string[] = [];
  const pushUnique = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    if (lines.includes(normalized)) return;
    lines.push(normalized);
  };

  const lifestyleDomains = ensureArray(payload.analysis?.wellness?.lifestyleRisk?.domains)
    .map((domain) => ({
      label: firstOrDash(domain?.name || domain?.id),
      percent: clampPercent(domain?.percent),
    }))
    .sort((left, right) => right.percent - left.percent);
  for (const domain of lifestyleDomains) {
    if (domain.percent < 70) continue;
    pushUnique(`${domain.label} 위험도가 ${toScoreLabel(domain.percent)}로 높습니다. 생활습관 교정이 우선입니다.`);
  }

  const sectionNeeds = ensureArray(payload.analysis?.wellness?.healthManagementNeed?.sections)
    .map((section) => ({
      title: firstOrDash(section?.sectionTitle || section?.sectionId),
      percent: clampPercent(section?.percent),
    }))
    .sort((left, right) => right.percent - left.percent);
  for (const section of sectionNeeds) {
    if (section.percent < 70) continue;
    pushUnique(`${section.title} 영역 관리 필요도가 ${toScoreLabel(section.percent)}로 높습니다.`);
  }

  const topIssues = ensureArray(payload.analysis?.summary?.topIssues).slice(0, 6);
  for (const issue of topIssues) {
    const title = firstOrDash(issue?.title);
    if (title === "-") continue;
    const score = toScoreValue(issue?.score);
    pushUnique(score == null ? `${title} 이슈를 우선 점검해 주세요.` : `${title} (${toScoreLabel(score)}) 이슈를 우선 점검해 주세요.`);
  }

  return lines.slice(0, MAX_RISK_LINES);
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
  const healthScore = toScoreValue(
    wellness?.overallHealthScore ?? payload.analysis?.summary?.overallScore ?? null
  );
  const lifestyleOverall = toScoreValue(wellness?.lifestyleRisk?.overallPercent ?? null);
  const healthNeedAverage = toScoreValue(wellness?.healthManagementNeed?.averagePercent ?? null);

  const donutOffset =
    healthScore == null
      ? DONUT_CIRCUMFERENCE
      : DONUT_CIRCUMFERENCE * (1 - clampPercent(healthScore) / 100);

  const axes: AxisItem[] = ensureArray(wellness?.lifestyleRisk?.domains)
    .map((axis) => ({
      id: firstOrDash(axis?.id),
      label: firstOrDash(axis?.name || axis?.id),
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
      sectionTitle: firstOrDash(section?.sectionTitle || section?.sectionId),
      percent: clampPercent(section?.percent),
    }))
    .sort((left, right) => {
      if (right.percent !== left.percent) return right.percent - left.percent;
      return left.sectionId.localeCompare(right.sectionId);
    });

  const analysisLines = normalizeSectionAdvice(payload);
  const riskLines = buildRiskLines(payload);

  const routineLines = ensureArray(wellness?.lifestyleRoutineAdvice)
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);

  const supplementLines = ensureArray(wellness?.supplementDesign)
    .flatMap((item) =>
      ensureArray(item?.paragraphs)
        .map((paragraph) => (typeof paragraph === "string" ? paragraph.trim() : ""))
        .filter(Boolean)
    )
    .slice(0, 4);

  return (
    <div className={styles.stack}>
      <section className={styles.reportTopGrid}>
        <article className={styles.reportTopCard}>
          <div className={styles.reportTopHead}>
            <h3 className={styles.sectionTitle}>건강점수</h3>
            <p className={styles.inlineHint}>점수 높을수록 좋음</p>
          </div>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 140 140" className={styles.donutSvg} role="img" aria-label="건강점수 도넛 차트">
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
              <strong>{toScoreLabel(healthScore)}</strong>
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
              aria-label="생활습관 위험도 다이아몬드 차트"
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
              <polygon points={polygonPoints(radarAxes.map((axis) => axis.score))} className={styles.radarArea} />
              {radarAxes.map((axis, index) => {
                const point = radarPoint(index, radarAxes.length, axis.score / 100);
                return <circle key={`point-${axis.id}`} cx={point.x} cy={point.y} r={3.6} className={styles.radarPoint} />;
              })}
              {radarAxes.map((axis, index) => {
                const point = radarPoint(index, radarAxes.length, 1.2);
                return (
                  <text key={`label-${axis.id}`} x={point.x} y={point.y} textAnchor="middle" className={styles.radarLabel}>
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
          {sectionNeeds.length === 0 ? (
            <p className={styles.inlineHint}>선택된 상세 섹션 데이터가 없습니다.</p>
          ) : (
            <ul className={styles.needList}>
              {sectionNeeds.map((section) => (
                <li key={`need-${section.sectionId}`} className={styles.needRow}>
                  <div className={styles.needHead}>
                    <span>{section.sectionTitle}</span>
                    <strong>{toScoreLabel(section.percent)}</strong>
                  </div>
                  <div className={styles.needTrack}>
                    <div className={styles.needFill} style={{ width: `${clampPercent(section.percent)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.inlineHint}>평균 필요도: {toScoreLabel(healthNeedAverage)}</p>
        </article>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>1. 종합 건강 분석 멘트</h3>
        </div>
        {analysisLines.length === 0 ? (
          <p className={styles.inlineHint}>0.5점 이상 문항이 없어 분석 멘트를 생성하지 않았습니다.</p>
        ) : (
          <ol className={styles.reportNarrativeList}>
            {analysisLines.map((line, index) => (
              <li key={`analysis-line-${index}`}>
                <strong>
                  {line.sectionTitle} · Q{line.questionNumber}
                </strong>{" "}
                {line.text}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>2. 주의가 필요한 고위험 항목</h3>
        </div>
        {riskLines.length === 0 ? (
          <p className={styles.inlineHint}>현재 임계치 이상 고위험 항목이 없습니다.</p>
        ) : (
          <ul className={styles.listPlain}>
            {riskLines.map((line, index) => (
              <li key={`risk-line-${index}`}>{line}</li>
            ))}
          </ul>
        )}
        {(routineLines.length > 0 || supplementLines.length > 0) && (
          <details className={styles.optionalCard}>
            <summary>추가 참고(생활습관 루틴 / 맞춤 영양제 설계)</summary>
            <div className={styles.optionalBody}>
              {routineLines.length > 0 && (
                <div>
                  <p className={styles.optionalText}>생활습관 루틴</p>
                  <ul className={styles.listPlain}>
                    {routineLines.map((line, index) => (
                      <li key={`routine-line-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {supplementLines.length > 0 && (
                <div>
                  <p className={styles.optionalText}>맞춤 영양제 설계</p>
                  <ul className={styles.listPlain}>
                    {supplementLines.map((line, index) => (
                      <li key={`supplement-line-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}
      </section>

      <section className={styles.metaFooter}>
        {viewerMode === "admin" ? (
          <>
            생성 시각: {formatDate(payload.meta?.generatedAt)} / 대상자: {firstOrDash(payload.meta?.employeeName)} / 기간: {firstOrDash(payload.meta?.periodKey)}
            {payload.meta?.isMockData ? " / 데모 데이터" : ""}
          </>
        ) : (
          <>
            대상자: {firstOrDash(payload.meta?.employeeName)} / 기간: {firstOrDash(payload.meta?.periodKey)}
          </>
        )}
      </section>
    </div>
  );
}
