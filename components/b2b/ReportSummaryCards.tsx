"use client";

import styles from "./B2bUx.module.css";

type PayloadSummary = {
  meta?: {
    employeeName?: string;
    generatedAt?: string;
    periodKey?: string;
    isMockData?: boolean;
  };
  analysis?: {
    summary?: {
      overallScore?: number;
      surveyScore?: number;
      healthScore?: number;
      medicationScore?: number;
      riskLevel?: string;
      topIssues?: Array<{ title?: string; score?: number; reason?: string }>;
    };
    recommendations?: string[];
    trend?: {
      months?: Array<{
        periodKey?: string;
        overallScore?: number;
        surveyScore?: number;
        healthScore?: number;
      }>;
    };
    aiEvaluation?: {
      summary?: string;
      monthlyGuide?: string;
      actionItems?: string[];
      caution?: string;
    } | null;
  };
  survey?: {
    sectionScores?: Array<{
      sectionTitle?: string;
      score?: number;
      answeredCount?: number;
      questionCount?: number;
    }>;
  };
  health?: {
    coreMetrics?: Array<{
      label?: string;
      value?: string;
      unit?: string | null;
      status?: string;
    }>;
    medicationStatus?: {
      type?: "available" | "none" | "fetch_failed" | "unknown";
      message?: string | null;
      failedTargets?: string[];
    };
    medications?: Array<{
      medicationName?: string;
      date?: string | null;
      dosageDay?: string | null;
      hospitalName?: string | null;
    }>;
  };
  pharmacist?: {
    summary?: string | null;
    recommendations?: string | null;
    cautions?: string | null;
  };
};

function formatScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}점`;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function formatMetricStatus(status?: string) {
  if (!status) return "확인 필요";
  if (status === "normal") return "정상";
  if (status === "high") return "높음";
  if (status === "low") return "낮음";
  if (status === "caution") return "주의";
  return status;
}

function medicationStatusLabel(type?: string) {
  if (type === "available") return "연동 완료";
  if (type === "none") return "기록 없음";
  if (type === "fetch_failed") return "조회 실패";
  return "확인 필요";
}

function firstOrDash(value: string | null | undefined) {
  if (!value) return "-";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

export default function ReportSummaryCards(props: {
  payload: PayloadSummary | null | undefined;
}) {
  const payload = props.payload;
  if (!payload) {
    return (
      <section className={styles.sectionCard}>
        <p className={styles.inlineHint}>아직 생성된 레포트 데이터가 없습니다.</p>
      </section>
    );
  }

  const topIssues = payload.analysis?.summary?.topIssues ?? [];
  const sectionScores = payload.survey?.sectionScores ?? [];
  const recommendations = payload.analysis?.recommendations ?? [];
  const trend = payload.analysis?.trend?.months ?? [];
  const metrics = payload.health?.coreMetrics ?? [];
  const medications = payload.health?.medications ?? [];
  const ai = payload.analysis?.aiEvaluation;
  const medStatus = payload.health?.medicationStatus;

  const issueRows = topIssues.slice(0, 3);
  const trendRows = trend.slice(-6);
  const metricRows = metrics.slice(0, 8);
  const sectionRows = sectionScores.slice(0, 8);
  const recommendationRows = recommendations.slice(0, 6);

  return (
    <div className={styles.stack}>
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>핵심 건강 요약</h3>
            <p className={styles.sectionDescription}>
              이번 달 점수, 주요 이슈, 복약 상태를 한눈에 확인합니다.
            </p>
          </div>
        </div>
        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>종합 점수</p>
            <p className={styles.metricValue}>
              {formatScore(payload.analysis?.summary?.overallScore)}
            </p>
            <p className={styles.metricSub}>
              위험 수준: {firstOrDash(payload.analysis?.summary?.riskLevel)}
            </p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>설문 점수</p>
            <p className={styles.metricValue}>
              {formatScore(payload.analysis?.summary?.surveyScore)}
            </p>
            <p className={styles.metricSub}>설문 답지 환산 기준</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>검진 점수</p>
            <p className={styles.metricValue}>
              {formatScore(payload.analysis?.summary?.healthScore)}
            </p>
            <p className={styles.metricSub}>최근 건강검진 핵심 지표</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>복약 점수</p>
            <p className={styles.metricValue}>
              {formatScore(payload.analysis?.summary?.medicationScore)}
            </p>
            <p className={styles.metricSub}>
              복약 상태: {medicationStatusLabel(medStatus?.type)}
            </p>
          </article>
        </div>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Top 이슈 3</h3>
          </div>
          {issueRows.length === 0 ? (
            <p className={styles.inlineHint}>표시할 이슈가 없습니다.</p>
          ) : (
            <ol className={styles.listPlain}>
              {issueRows.map((issue, index) => (
                <li key={`${issue.title ?? "issue"}-${index}`}>
                  {firstOrDash(issue.title)} ({formatScore(issue.score)})
                  {issue.reason ? ` - ${issue.reason}` : ""}
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>최근 복약 3건</h3>
          </div>
          {medications.length === 0 ? (
            <p className={styles.inlineHint}>복약 데이터가 없습니다.</p>
          ) : (
            <ul className={styles.listPlain}>
              {medications.slice(0, 3).map((item, index) => (
                <li key={`${item.medicationName ?? "med"}-${index}`}>
                  {firstOrDash(item.medicationName)}
                  {item.date ? ` / ${item.date}` : ""}
                  {item.dosageDay ? ` / ${item.dosageDay}` : ""}
                  {item.hospitalName ? ` / ${item.hospitalName}` : ""}
                </li>
              ))}
            </ul>
          )}
          {medStatus?.message ? (
            <p className={styles.inlineHint}>{medStatus.message}</p>
          ) : null}
        </article>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>월별 추이 (최근 6개월)</h3>
          </div>
          {trendRows.length === 0 ? (
            <p className={styles.inlineHint}>추이 데이터가 없습니다.</p>
          ) : (
            <ul className={styles.listPlain}>
              {trendRows.map((month, index) => (
                <li key={`${month.periodKey ?? "period"}-${index}`}>
                  {firstOrDash(month.periodKey)} - 종합 {formatScore(month.overallScore)} /
                  설문 {formatScore(month.surveyScore)} / 검진{" "}
                  {formatScore(month.healthScore)}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>권장 실천 항목</h3>
          </div>
          {recommendationRows.length === 0 ? (
            <p className={styles.inlineHint}>추천 항목이 없습니다.</p>
          ) : (
            <ul className={styles.listPlain}>
              {recommendationRows.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>섹션별 점수</h3>
          </div>
          {sectionRows.length === 0 ? (
            <p className={styles.inlineHint}>섹션 점수 데이터가 없습니다.</p>
          ) : (
            <ul className={styles.listPlain}>
              {sectionRows.map((section, index) => (
                <li key={`${section.sectionTitle ?? "section"}-${index}`}>
                  {firstOrDash(section.sectionTitle)}: {formatScore(section.score)}
                  {typeof section.answeredCount === "number" &&
                  typeof section.questionCount === "number"
                    ? ` (${section.answeredCount}/${section.questionCount})`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>검진 핵심 지표</h3>
          </div>
          {metricRows.length === 0 ? (
            <p className={styles.inlineHint}>검진 지표가 없습니다.</p>
          ) : (
            <ul className={styles.listPlain}>
              {metricRows.map((metric, index) => (
                <li key={`${metric.label ?? "metric"}-${index}`}>
                  {firstOrDash(metric.label)}: {firstOrDash(metric.value)}
                  {metric.unit ? ` ${metric.unit}` : ""} /{" "}
                  {formatMetricStatus(metric.status)}
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
          <ul className={styles.listPlain}>
            <li>요약: {firstOrDash(payload.pharmacist?.summary)}</li>
            <li>권장: {firstOrDash(payload.pharmacist?.recommendations)}</li>
            <li>주의: {firstOrDash(payload.pharmacist?.cautions)}</li>
          </ul>
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>AI 종합 평가</h3>
          </div>
          {ai ? (
            <ul className={styles.listPlain}>
              <li>종합 평가: {firstOrDash(ai.summary)}</li>
              <li>한 달 실천 가이드: {firstOrDash(ai.monthlyGuide)}</li>
              {Array.isArray(ai.actionItems) && ai.actionItems.length > 0
                ? ai.actionItems.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`}>실천 {index + 1}: {item}</li>
                  ))
                : null}
              {ai.caution ? <li>주의 문구: {ai.caution}</li> : null}
            </ul>
          ) : (
            <p className={styles.inlineHint}>생성된 AI 평가가 없습니다.</p>
          )}
        </article>
      </section>

      <section className={styles.metaFooter}>
        생성 시각: {formatDate(payload.meta?.generatedAt)} / 대상자:{" "}
        {firstOrDash(payload.meta?.employeeName)} / 기간:{" "}
        {firstOrDash(payload.meta?.periodKey)}
        {payload.meta?.isMockData ? " / 데모 데이터" : ""}
      </section>
    </div>
  );
}
