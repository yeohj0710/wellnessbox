"use client";

import styles from "./B2bUx.module.css";
import {
  REPORT_ACCENT_COLORS,
  medicationStatusLabel,
  medicationStatusTone,
  normalizeMetricStatusLabel,
  normalizeRiskLevelLabel,
  resolveMetricStatusTone,
} from "@/lib/b2b/report-design";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  badgeClass,
  buildSparklinePoints,
  ensureArray,
  firstOrDash,
  formatDate,
  formatDelta,
  resolveScore,
  scoreBarClass,
  scoreTone,
  scoreWidth,
  toScoreLabel,
  toScoreValue,
  toneColor,
  toneLabel,
} from "./report-summary/helpers";

const GAUGE_RADIUS = 46;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
const SPARKLINE_WIDTH = 320;
const SPARKLINE_HEIGHT = 112;
const SPARKLINE_PAD = 12;

export default function ReportSummaryCards(props: {
  payload: ReportSummaryPayload | null | undefined;
  viewerMode?: "employee" | "admin";
}) {
  const payload = props.payload;
  const viewerMode = props.viewerMode ?? "admin";
  const showRichVisuals = false;

  if (!payload) {
    return (
      <section className={styles.sectionCard}>
        <p className={styles.inlineHint}>아직 생성된 리포트 데이터가 없습니다.</p>
      </section>
    );
  }

  const topIssues = ensureArray(payload.analysis?.summary?.topIssues);
  const sectionScores = ensureArray(payload.survey?.sectionScores);
  const recommendations = ensureArray(payload.analysis?.recommendations);
  const trendMonths = ensureArray(payload.analysis?.trend?.months);
  const metrics = ensureArray(payload.health?.coreMetrics);
  const medications = ensureArray(payload.health?.medications);
  const ai = payload.analysis?.aiEvaluation;
  const medStatus = payload.health?.medicationStatus;
  const scoreDetails = payload.analysis?.scoreDetails;

  const overallScoreInfo = resolveScore(
    "overall",
    payload.analysis?.summary?.overallScore,
    scoreDetails
  );
  const surveyScoreInfo = resolveScore(
    "survey",
    payload.analysis?.summary?.surveyScore,
    scoreDetails
  );
  const healthScoreInfo = resolveScore(
    "health",
    payload.analysis?.summary?.healthScore,
    scoreDetails
  );
  const medicationScoreInfo = resolveScore(
    "medication",
    payload.analysis?.summary?.medicationScore,
    scoreDetails
  );

  const overallScore = overallScoreInfo.value;
  const surveyScore = surveyScoreInfo.value;
  const healthScore = healthScoreInfo.value;
  const medicationScore = medicationScoreInfo.value;
  const riskTone = scoreTone(overallScore);
  const gaugeOffset =
    overallScore == null
      ? GAUGE_CIRCUMFERENCE
      : GAUGE_CIRCUMFERENCE * (1 - scoreWidth(overallScore) / 100);

  const summaryCards = [
    {
      key: "overall",
      label: "종합 점수",
      score: overallScore,
      helper:
        overallScoreInfo.status === "missing"
          ? overallScoreInfo.reason
          : `위험도 ${normalizeRiskLevelLabel(payload.analysis?.summary?.riskLevel)}`,
    },
    {
      key: "survey",
      label: "설문 점수",
      score: surveyScore,
      helper:
        surveyScoreInfo.status === "missing"
          ? surveyScoreInfo.reason
          : "설문 응답 기반 점수",
    },
    {
      key: "health",
      label: "검진 점수",
      score: healthScore,
      helper:
        healthScoreInfo.status === "missing"
          ? healthScoreInfo.reason
          : "건강검진 핵심 지표 점수",
    },
    {
      key: "medication",
      label: "복약 점수",
      score: medicationScore,
      helper:
        medicationScoreInfo.status === "missing"
          ? medicationScoreInfo.reason
          : `상태 ${medicationStatusLabel(medStatus?.type)}`,
    },
  ];

  const scoreChartItems = [
    { key: "overall", label: "종합", score: overallScore, color: REPORT_ACCENT_COLORS.primary },
    { key: "survey", label: "설문", score: surveyScore, color: REPORT_ACCENT_COLORS.warning },
    { key: "health", label: "검진", score: healthScore, color: REPORT_ACCENT_COLORS.secondary },
    {
      key: "medication",
      label: "복약",
      score: medicationScore,
      color: REPORT_ACCENT_COLORS.neutral,
    },
  ];

  const trendRows = trendMonths.slice(-6).map((row) => ({
    periodKey: firstOrDash(row.periodKey),
    overallScore: toScoreValue(row.overallScore),
    surveyScore: toScoreValue(row.surveyScore),
    healthScore: toScoreValue(row.healthScore),
  }));
  const sparklineScores = trendRows.map((row) => row.overallScore ?? 0);
  const sparklinePoints = buildSparklinePoints(sparklineScores, {
    width: SPARKLINE_WIDTH,
    height: SPARKLINE_HEIGHT,
    pad: SPARKLINE_PAD,
  });
  const previousOverallScore =
    trendRows.length >= 2 ? trendRows[trendRows.length - 2].overallScore : null;
  const overallDeltaText = formatDelta(overallScore, previousOverallScore);

  const distributionCounts = metrics.reduce(
    (acc, metric) => {
      const tone = resolveMetricStatusTone(metric.status);
      acc[tone] += 1;
      return acc;
    },
    {
      ok: 0,
      warning: 0,
      danger: 0,
      muted: 0,
    }
  );

  const distributionItems = [
    { key: "ok", tone: "ok", count: distributionCounts.ok },
    { key: "warning", tone: "warning", count: distributionCounts.warning },
    { key: "danger", tone: "danger", count: distributionCounts.danger },
    { key: "muted", tone: "muted", count: distributionCounts.muted },
  ] as const;
  const distributionTotal = distributionItems.reduce((sum, item) => sum + item.count, 0);

  const surveyAnsweredCount = sectionScores.reduce(
    (sum, row) => sum + (row.answeredCount ?? 0),
    0
  );
  const surveyQuestionCount = sectionScores.reduce(
    (sum, row) => sum + (row.questionCount ?? 0),
    0
  );
  const surveyResponseCount =
    ensureArray(payload.survey?.answers).length || surveyAnsweredCount;

  const sectionScoreChart = [...sectionScores]
    .map((row) => ({
      title: firstOrDash(row.sectionTitle),
      score: toScoreValue(row.score) ?? 0,
      answeredCount: row.answeredCount ?? 0,
      questionCount: row.questionCount ?? 0,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const guideItems = ensureArray(ai?.actionItems)
    .filter((item): item is string => Boolean(item && item.trim()))
    .slice(0, 5);
  const fallbackGuideItems = recommendations
    .filter((item): item is string => Boolean(item && item.trim()))
    .slice(0, 5);
  const practiceItems = guideItems.length > 0 ? guideItems : fallbackGuideItems;

  return (
    <div className={styles.stack}>
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>이번 달 건강 요약</h3>
            <p className={styles.sectionDescription}>
              핵심 점수와 위험도, 우선 확인할 이슈를 먼저 확인하세요.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
              riskTone
            )}`}
          >
            {normalizeRiskLevelLabel(payload.analysis?.summary?.riskLevel)}
          </span>
        </div>
        <div className={styles.metricsGrid}>
          {summaryCards.map((card) => (
            <article key={card.key} className={styles.metricCard}>
              <p className={styles.metricLabel}>{card.label}</p>
              <p className={styles.metricValue}>{toScoreLabel(card.score)}</p>
              <div className={styles.vizTrack}>
                <div
                  className={`${styles.vizFill} ${scoreBarClass(card.score)}`}
                  style={{ width: `${scoreWidth(card.score)}%` }}
                />
              </div>
              <p className={styles.metricSub}>{card.helper}</p>
            </article>
          ))}
        </div>
      </section>

      {showRichVisuals ? (
        <section className={styles.visualGrid}>
        <article className={styles.visualCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>종합 점수 게이지</h3>
            <span className={styles.inlineHint}>{overallDeltaText}</span>
          </div>
          <div className={styles.gaugeWrap}>
            <svg
              className={styles.gaugeSvg}
              viewBox="0 0 120 120"
              role="img"
              aria-label={
                overallScore == null ? "종합 점수 데이터 없음" : `종합 점수 ${overallScore}점`
              }
            >
              <circle cx="60" cy="60" r={GAUGE_RADIUS} className={styles.gaugeTrack} />
              <circle
                cx="60"
                cy="60"
                r={GAUGE_RADIUS}
                className={styles.gaugeProgress}
                style={{
                  strokeDasharray: GAUGE_CIRCUMFERENCE,
                  strokeDashoffset: gaugeOffset,
                  stroke: toneColor(riskTone),
                }}
              />
            </svg>
            <div className={styles.gaugeValue}>{toScoreLabel(overallScore)}</div>
            <p className={styles.gaugeLabel}>
              위험도 {normalizeRiskLevelLabel(payload.analysis?.summary?.riskLevel)}
            </p>
          </div>
        </article>

        <article className={styles.visualCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>영역별 점수 막대</h3>
          </div>
          <ul className={styles.vizBarList}>
            {scoreChartItems.map((item) => (
              <li key={item.key} className={styles.vizBarRow}>
                <div className={styles.vizBarHead}>
                  <span>{item.label}</span>
                  <strong>{toScoreLabel(item.score)}</strong>
                </div>
                <div className={styles.vizTrack}>
                  <div
                    className={styles.vizFill}
                    style={{
                      width: `${scoreWidth(item.score)}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.visualCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>월별 종합 점수 추이</h3>
            <span className={styles.inlineHint}>
              최근 {trendRows.length > 0 ? trendRows.length : 0}개월
            </span>
          </div>
          {trendRows.length === 0 ? (
            <p className={styles.inlineHint}>추이 데이터가 없습니다.</p>
          ) : (
            <div className={styles.sparklineWrap}>
              <svg
                className={styles.sparklineSvg}
                viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                role="img"
                aria-label="월별 종합 점수 추이"
              >
                <line
                  x1={SPARKLINE_PAD}
                  y1={SPARKLINE_HEIGHT - SPARKLINE_PAD}
                  x2={SPARKLINE_WIDTH - SPARKLINE_PAD}
                  y2={SPARKLINE_HEIGHT - SPARKLINE_PAD}
                  className={styles.sparklineAxis}
                />
                <line
                  x1={SPARKLINE_PAD}
                  y1={SPARKLINE_PAD}
                  x2={SPARKLINE_PAD}
                  y2={SPARKLINE_HEIGHT - SPARKLINE_PAD}
                  className={styles.sparklineAxis}
                />
                <polyline points={sparklinePoints} className={styles.sparklineLine} />
                {sparklineScores.map((score, index) => {
                  const width = SPARKLINE_WIDTH - SPARKLINE_PAD * 2;
                  const height = SPARKLINE_HEIGHT - SPARKLINE_PAD * 2;
                  const stepX = sparklineScores.length > 1 ? width / (sparklineScores.length - 1) : 0;
                  const x = SPARKLINE_PAD + stepX * index;
                  const y = SPARKLINE_HEIGHT - SPARKLINE_PAD - (score / 100) * height;
                  return (
                    <circle
                      key={`spark-${index}`}
                      cx={x}
                      cy={y}
                      r={3.5}
                      className={styles.sparklinePoint}
                    />
                  );
                })}
              </svg>
              <div className={styles.sparklineLabels}>
                {trendRows.map((row) => (
                  <span key={`spark-label-${row.periodKey}`}>{row.periodKey}</span>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className={styles.visualCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>검진 판정 분포</h3>
            <span className={styles.inlineHint}>총 {metrics.length}개 지표</span>
          </div>
          {metrics.length === 0 ? (
            <p className={styles.inlineHint}>검진 지표가 없습니다.</p>
          ) : (
            <>
              <div className={styles.distributionTrack}>
                {distributionItems.map((item) => {
                  const ratio =
                    distributionTotal > 0 ? (item.count / distributionTotal) * 100 : 0;
                  return (
                    <span
                      key={item.key}
                      className={styles.distributionSegment}
                      style={{
                        width: `${ratio}%`,
                        background: toneColor(item.tone),
                      }}
                    />
                  );
                })}
              </div>
              <ul className={styles.distributionLegend}>
                {distributionItems.map((item) => (
                  <li key={`legend-${item.key}`}>
                    <span
                      className={styles.legendDot}
                      style={{ background: toneColor(item.tone) }}
                    />
                    {toneLabel(item.tone)} {item.count}
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
        </section>
      ) : null}

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>핵심 이슈 TOP 3</h3>
          </div>
          {topIssues.length === 0 ? (
            <p className={styles.inlineHint}>핵심 이슈가 아직 계산되지 않았습니다.</p>
          ) : (
            <ol className={styles.listPlain}>
              {topIssues.slice(0, 3).map((issue, index) => (
                <li key={`${issue.title ?? "issue"}-${index}`}>
                  <span className="font-semibold">{firstOrDash(issue.title)}</span>{" "}
                  <span className="text-slate-500">({toScoreLabel(toScoreValue(issue.score))})</span>
                  {issue.reason ? <div className={styles.inlineHint}>{issue.reason}</div> : null}
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>이번 달 실천 가이드</h3>
          </div>
          {practiceItems.length === 0 ? (
            <p className={styles.inlineHint}>추천 실천 항목이 없습니다.</p>
          ) : (
            <ul className="grid gap-2">
              {practiceItems.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>검진 핵심 지표</h3>
          </div>
          {metrics.length === 0 ? (
            <p className={styles.inlineHint}>검진 지표가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-2">지표</th>
                    <th className="px-2">값</th>
                    <th className="px-2">판정</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 10).map((metric, index) => {
                    const tone = resolveMetricStatusTone(metric.status);
                    return (
                      <tr key={`${metric.label ?? "metric"}-${index}`} className="bg-white">
                        <td className="rounded-l-lg border border-r-0 border-slate-200 px-2 py-2 font-medium text-slate-800">
                          {firstOrDash(metric.label)}
                        </td>
                        <td className="border border-x-0 border-slate-200 px-2 py-2 text-slate-700">
                          {firstOrDash(metric.value)}
                          {metric.unit ? ` ${metric.unit}` : ""}
                        </td>
                        <td className="rounded-r-lg border border-l-0 border-slate-200 px-2 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(
                              tone
                            )}`}
                          >
                            {normalizeMetricStatusLabel(metric.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>복약 요약</h3>
            <span
              className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(
                medicationStatusTone(medStatus?.type)
              )}`}
            >
              {medicationStatusLabel(medStatus?.type)}
            </span>
          </div>
          {medications.length === 0 ? (
            <p className={styles.inlineHint}>
              {medStatus?.type === "none"
                ? "최근 복약 이력이 없습니다."
                : medStatus?.type === "fetch_failed"
                ? "복약 조회에 실패했습니다."
                : "복약 데이터가 아직 없습니다."}
            </p>
          ) : (
            <ul className={styles.listPlain}>
              {medications.slice(0, 3).map((item, index) => (
                <li key={`${item.medicationName ?? "med"}-${index}`}>
                  <span className="font-semibold">{firstOrDash(item.medicationName)}</span>
                  <div className={styles.inlineHint}>
                    {item.date || "날짜 없음"}
                    {item.dosageDay ? ` / ${item.dosageDay}` : ""}
                    {item.hospitalName ? ` / ${item.hospitalName}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {medStatus?.message ? <p className={styles.inlineHint}>{medStatus.message}</p> : null}
        </article>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>설문 결과 시각화</h3>
          </div>
          {surveyResponseCount <= 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              설문 미진행 상태입니다. 설문을 완료하면 맞춤 분석 정확도가 올라갑니다.
            </div>
          ) : (
            <div className={styles.stack}>
              <p className={styles.inlineHint}>
                응답 수 {surveyResponseCount} / 완료율{" "}
                {surveyQuestionCount > 0
                  ? `${Math.round((surveyAnsweredCount / surveyQuestionCount) * 100)}%`
                  : "-"}
              </p>
              {sectionScoreChart.length === 0 ? (
                <p className={styles.inlineHint}>섹션 점수 데이터가 없습니다.</p>
              ) : (
                <ul className={styles.vizBarList}>
                  {sectionScoreChart.map((section, index) => (
                    <li key={`${section.title}-${index}`} className={styles.vizBarRow}>
                      <div className={styles.vizBarHead}>
                        <span>{section.title}</span>
                        <strong>{toScoreLabel(section.score)}</strong>
                      </div>
                      <div className={styles.vizTrack}>
                        <div
                          className={styles.vizFill}
                          style={{
                            width: `${scoreWidth(section.score)}%`,
                            background: REPORT_ACCENT_COLORS.primary,
                          }}
                        />
                      </div>
                      <p className={styles.inlineHint}>
                        응답 {section.answeredCount}/{section.questionCount}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>월별 추이</h3>
          </div>
          {trendRows.length === 0 ? (
            <p className={styles.inlineHint}>추이 데이터가 없습니다.</p>
          ) : showRichVisuals ? (
            <div className={styles.stack}>
              <div className={styles.trendColumns}>
                {trendRows.map((row) => (
                  <div key={`trend-col-${row.periodKey}`} className={styles.trendColumn}>
                    <div className={styles.trendBarGroup}>
                      <span
                        className={styles.trendBar}
                        style={{
                          height: `${scoreWidth(row.overallScore)}%`,
                          background: REPORT_ACCENT_COLORS.primary,
                        }}
                        title={`${row.periodKey} 종합 ${toScoreLabel(row.overallScore)}`}
                      />
                      <span
                        className={styles.trendBar}
                        style={{
                          height: `${scoreWidth(row.surveyScore)}%`,
                          background: REPORT_ACCENT_COLORS.warning,
                        }}
                        title={`${row.periodKey} 설문 ${toScoreLabel(row.surveyScore)}`}
                      />
                      <span
                        className={styles.trendBar}
                        style={{
                          height: `${scoreWidth(row.healthScore)}%`,
                          background: REPORT_ACCENT_COLORS.secondary,
                        }}
                        title={`${row.periodKey} 검진 ${toScoreLabel(row.healthScore)}`}
                      />
                    </div>
                    <span className={styles.trendLabel}>{row.periodKey}</span>
                  </div>
                ))}
              </div>
              <ul className={styles.distributionLegend}>
                <li>
                  <span
                    className={styles.legendDot}
                    style={{ background: REPORT_ACCENT_COLORS.primary }}
                  />
                  종합
                </li>
                <li>
                  <span
                    className={styles.legendDot}
                    style={{ background: REPORT_ACCENT_COLORS.warning }}
                  />
                  설문
                </li>
                <li>
                  <span
                    className={styles.legendDot}
                    style={{ background: REPORT_ACCENT_COLORS.secondary }}
                  />
                  검진
                </li>
              </ul>
            </div>
          ) : (
            <ul className={styles.listPlain}>
              {trendRows.map((row) => (
                <li key={`trend-row-${row.periodKey}`}>
                  <span className="font-semibold">{row.periodKey}</span>
                  <div className={styles.inlineHint}>
                    종합 {toScoreLabel(row.overallScore)} / 설문{" "}
                    {toScoreLabel(row.surveyScore)} / 검진 {toScoreLabel(row.healthScore)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>약사 코멘트</h3>
          </div>
          <p className="text-sm leading-6 text-slate-700">
            {firstOrDash(payload.pharmacist?.summary)}
          </p>
          <details className={styles.optionalCard}>
            <summary>자세히 보기</summary>
            <div className={styles.optionalBody}>
              <p className={styles.optionalText}>
                권장: {firstOrDash(payload.pharmacist?.recommendations)}
              </p>
              <p className={styles.optionalText}>
                주의: {firstOrDash(payload.pharmacist?.cautions)}
              </p>
            </div>
          </details>
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>AI 종합 코멘트</h3>
          </div>
          {ai ? (
            <>
              <p className="text-sm leading-6 text-slate-700">{firstOrDash(ai.summary)}</p>
              <details className={styles.optionalCard}>
                <summary>자세히 보기</summary>
                <div className={styles.optionalBody}>
                  <p className={styles.optionalText}>
                    이번 달 가이드: {firstOrDash(ai.monthlyGuide)}
                  </p>
                  {ai.caution ? (
                    <p className={styles.optionalText}>주의 문구: {ai.caution}</p>
                  ) : null}
                </div>
              </details>
            </>
          ) : (
            <p className={styles.inlineHint}>생성된 AI 평가가 없습니다.</p>
          )}
        </article>
      </section>

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
    </div>
  );
}
