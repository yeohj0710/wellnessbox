"use client";

import React from "react";
import type { NhisAiSummary } from "../types";
import { HEALTH_LINK_COPY } from "../copy";
import type { LatestCheckupMeta, MedicationDigest } from "../utils";
import styles from "../HealthLinkClient.module.css";
import {
  buildMedicationAnalysisModel,
  buildMetricInsightCards,
  buildMetricGroups,
  buildMetricTabs,
  normalizeCompactText,
  renderMetricCards,
  resolveAiRiskClass,
  resolveAiRiskLabel,
  type LatestCheckupRow,
  type MetricGroupId,
} from "./HealthLinkResultSection.helpers";

type HealthLinkResultContentProps = {
  latestCheckupRows: LatestCheckupRow[];
  latestCheckupMeta: LatestCheckupMeta;
  medicationDigest: MedicationDigest;
  aiSummary: NhisAiSummary | null;
};

export function HealthLinkResultContent({
  latestCheckupRows,
  latestCheckupMeta,
  medicationDigest,
  aiSummary,
}: HealthLinkResultContentProps) {
  const hasCheckupRows = latestCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
  const showMedicationSection = hasMedicationRows || !hasCheckupRows;
  const cautionRows = latestCheckupRows.filter(
    (row) => row.statusTone === "caution"
  );
  const topMedicines = medicationDigest.topMedicines.slice(0, 4);
  const recentMedications = medicationDigest.recentMedications.slice(0, 4);
  const medicationOnlyMode = !hasCheckupRows && hasMedicationRows;
  const medicationAnalysis = React.useMemo(
    () => buildMedicationAnalysisModel(medicationDigest),
    [medicationDigest]
  );

  const hasAiSummary =
    !!aiSummary &&
    (aiSummary.summary.trim().length > 0 ||
      aiSummary.highlights.length > 0 ||
      aiSummary.nextSteps.length > 0);

  const groupedRows = React.useMemo(
    () => buildMetricGroups(latestCheckupRows),
    [latestCheckupRows]
  );

  const metricTabs = React.useMemo(
    () => buildMetricTabs(groupedRows, latestCheckupRows.length),
    [groupedRows, latestCheckupRows.length]
  );

  const [activeGroup, setActiveGroup] = React.useState<MetricGroupId>("all");
  const [showAllMetrics, setShowAllMetrics] = React.useState(false);

  React.useEffect(() => {
    if (metricTabs.some((tab) => tab.id === activeGroup)) return;
    setActiveGroup("all");
  }, [activeGroup, metricTabs]);

  React.useEffect(() => {
    setShowAllMetrics(false);
  }, [activeGroup]);

  const visibleRows =
    activeGroup === "all" ? latestCheckupRows : groupedRows[activeGroup];
  const prioritizedRows =
    activeGroup === "all"
      ? [
          ...visibleRows.filter((row) => row.statusTone === "caution"),
          ...visibleRows.filter((row) => row.statusTone !== "caution"),
        ]
      : visibleRows;
  const metricVisibleCount = 8;
  const metricRows = showAllMetrics
    ? prioritizedRows
    : prioritizedRows.slice(0, metricVisibleCount);
  const hiddenMetricCount = Math.max(
    prioritizedRows.length - metricRows.length,
    0
  );

  const summaryInsights = React.useMemo(() => {
    const aiInsights =
      aiSummary?.metricInsights
        ?.map((item) => {
          const metric = item?.metric?.trim();
          const value = item?.value?.trim();
          const interpretation = item?.interpretation?.trim();
          const tip = item?.tip?.trim();
          if (!metric || !value || !interpretation || !tip) return null;
          return {
            metric,
            value,
            interpretation,
            tip,
            tone:
              cautionRows.some(
                (row) =>
                  (row.metric ?? "").replace(/\s+/g, "").toLowerCase() ===
                  metric.replace(/\s+/g, "").toLowerCase()
              ) && hasCheckupRows
                ? ("caution" as const)
                : ("normal" as const),
          };
        })
        .filter(
          (item): item is NonNullable<typeof item> => item !== null
        ) ?? [];
    if (aiInsights.length > 0) return aiInsights.slice(0, 3);

    const sourceRows = cautionRows.length > 0 ? cautionRows : latestCheckupRows;
    return buildMetricInsightCards(sourceRows, 3);
  }, [aiSummary?.metricInsights, cautionRows, hasCheckupRows, latestCheckupRows]);

  const summaryHeadline =
    hasAiSummary && aiSummary
      ? aiSummary.headline
      : HEALTH_LINK_COPY.result.summaryFallbackHeadline;
  const summaryBody =
    hasAiSummary && aiSummary
      ? aiSummary.summary
      : HEALTH_LINK_COPY.result.summaryFallbackBody;
  const summaryRiskLevel =
    hasAiSummary && aiSummary ? aiSummary.riskLevel : "unknown";
  const topMedicineLine = topMedicines
    .map((item) => `${item.label} ${item.count}건`)
    .join(", ");

  const resolveInsightToneLabel = (
    tone: "normal" | "caution" | "unknown"
  ) => {
    if (tone === "caution") return HEALTH_LINK_COPY.result.statusCaution;
    if (tone === "normal") return HEALTH_LINK_COPY.result.statusNormal;
    return HEALTH_LINK_COPY.result.statusUnknown;
  };

  const resolveInsightToneClass = (
    tone: "normal" | "caution" | "unknown"
  ) => {
    if (tone === "caution") return styles.toneCaution;
    if (tone === "normal") return styles.toneNormal;
    return styles.toneUnknown;
  };

  return (
    <>
      <section className={`${styles.compactSection} ${styles.summaryHeroSection}`}>
        <div className={styles.compactHeader}>
          <h3>{HEALTH_LINK_COPY.result.summaryTitle}</h3>
          <span
            className={`${styles.aiRiskBadge} ${resolveAiRiskClass(
              summaryRiskLevel
            )}`}
          >
            {resolveAiRiskLabel(summaryRiskLevel)}
          </span>
        </div>

        <p className={styles.summaryHeroHeadline}>{summaryHeadline}</p>
        <p className={styles.summaryHeroBody}>{summaryBody}</p>

        <div className={styles.summaryStatRow}>
          {hasCheckupRows ? (
            <span className={styles.summaryStatPill}>
              검진 {latestCheckupRows.length.toLocaleString("ko-KR")}개
            </span>
          ) : null}
          {hasCheckupRows ? (
            <span className={`${styles.summaryStatPill} ${styles.summaryWarnPill}`}>
              주의 {cautionRows.length.toLocaleString("ko-KR")}개
            </span>
          ) : null}
          {showMedicationSection ? (
            <span className={styles.summaryStatPill}>
              투약 {medicationDigest.totalRows.toLocaleString("ko-KR")}건
            </span>
          ) : null}
        </div>

        {summaryInsights.length > 0 ? (
          <ul className={styles.summaryInsightList}>
            {summaryInsights.map((item, index) => (
              <li key={`${item.metric}-${item.value}-${index}`}>
                <div className={styles.summaryInsightTop}>
                  <strong>{item.metric}</strong>
                  <span
                    className={`${styles.metricTone} ${resolveInsightToneClass(
                      item.tone
                    )}`}
                  >
                    {resolveInsightToneLabel(item.tone)}
                  </span>
                </div>
                <p className={styles.summaryInsightValue}>{item.value}</p>
                <p className={styles.summaryInsightText}>{item.interpretation}</p>
                <p className={styles.summaryInsightTip}>{item.tip}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {hasCheckupRows ? (
        <section className={styles.compactSection}>
          <div className={styles.compactHeader}>
            <h3>검진 항목</h3>
            <span>
              {latestCheckupMeta.checkupDate
                ? `최근 검사 ${latestCheckupMeta.checkupDate}`
                : `${prioritizedRows.length.toLocaleString("ko-KR")}개 표시`}
            </span>
          </div>
          <p className={styles.sectionSubText}>
            {HEALTH_LINK_COPY.result.metricLead}
          </p>
          <div className={styles.metricFilterWrap}>
            {metricTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeGroup === tab.id}
                className={`${styles.metricFilterChip} ${
                  activeGroup === tab.id ? styles.metricFilterChipActive : ""
                }`}
                onClick={() => setActiveGroup(tab.id)}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
          {metricRows.length > 0 ? (
            <div className={styles.metricBoard}>{renderMetricCards(metricRows)}</div>
          ) : (
            <div className={styles.emptyHint}>표시할 검진 항목이 없습니다.</div>
          )}
          {hiddenMetricCount > 0 ? (
            <button
              type="button"
              className={styles.metricExpandButton}
              onClick={() => setShowAllMetrics(true)}
            >
              {`${HEALTH_LINK_COPY.result.metricExpandPrefix}${hiddenMetricCount.toLocaleString(
                "ko-KR"
              )}${HEALTH_LINK_COPY.result.metricExpandSuffix}`}
            </button>
          ) : null}
          {showAllMetrics && prioritizedRows.length > metricVisibleCount ? (
            <button
              type="button"
              className={styles.metricCollapseButton}
              onClick={() => setShowAllMetrics(false)}
            >
              {HEALTH_LINK_COPY.result.metricCollapseLabel}
            </button>
          ) : null}
        </section>
      ) : null}

      {medicationOnlyMode ? (
        <section className={`${styles.compactSection} ${styles.medicationFocusSection}`}>
          <div className={styles.compactHeader}>
            <h3>복약 맞춤 분석</h3>
            <span>최근 1건 기준</span>
          </div>
          <p className={styles.sectionSubText}>
            건강검진 데이터가 없어도 최근 복약 이력을 기준으로 핵심만 빠르게 정리해
            드려요.
          </p>

          {medicationAnalysis.latestMedication ? (
            <article className={styles.medicationHeroCard}>
              <p className={styles.medicationHeroKicker}>가장 최근 복약</p>
              <strong className={styles.medicationHeroMedicine}>
                {medicationAnalysis.latestMedication.medicine}
              </strong>
              <p className={styles.medicationHeroMeta}>
                {normalizeCompactText(medicationAnalysis.latestMedication.date) ??
                  "날짜 정보 없음"}
              </p>
              <p className={styles.medicationHeroPurpose}>
                {medicationAnalysis.primaryPurpose
                  ? `복용 목적: ${medicationAnalysis.primaryPurpose}`
                  : "복용 목적 정보가 없어 약품명 중심으로 안내드려요."}
              </p>
            </article>
          ) : null}

          <div className={styles.medicationSummaryGrid}>
            {medicationAnalysis.summaryItems.map((item) => (
              <article key={item.label} className={styles.medicationSummaryCard}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className={styles.medicationInsightList}>
            {medicationAnalysis.insights.map((insight, index) => (
              <p key={`${insight}-${index}`}>{insight}</p>
            ))}
          </div>

          <ul className={styles.medicationActionList}>
            {medicationAnalysis.nextActions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showMedicationSection && !medicationOnlyMode ? (
        <details className={styles.optionalSection}>
          <summary>
            <span>{HEALTH_LINK_COPY.result.medicationDetailsSummary}</span>
            <small>
              {medicationDigest.totalRows.toLocaleString("ko-KR")}
              건
            </small>
          </summary>
          <div className={styles.optionalSectionBody}>
            <div className={styles.optionalSummaryRow}>
              <span>
                복약 이력 {medicationDigest.totalRows.toLocaleString("ko-KR")}건
              </span>
              <span>
                고유 약품{" "}
                {medicationDigest.uniqueMedicineCount.toLocaleString("ko-KR")}종
              </span>
            </div>
            {topMedicineLine ? (
              <p className={styles.optionalBodyText}>
                자주 복용한 약: {topMedicineLine}
              </p>
            ) : null}
            <div className={styles.recentMedicationList}>
              {recentMedications.length === 0 ? (
                <span className={styles.emptyHint}>-</span>
              ) : (
                recentMedications.map((item) => (
                  <div
                    key={`${item.date}-${item.medicine}`}
                    className={styles.recentMedicationItem}
                  >
                    <span>{item.date}</span>
                    <strong>{item.medicine}</strong>
                    <small>{item.effect ?? "-"}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
      ) : null}
    </>
  );
}
