"use client";

import React from "react";
import type { NhisAiSummary } from "../types";
import { HEALTH_LINK_COPY } from "../copy";
import type { LatestCheckupMeta, MedicationDigest } from "../utils";
import styles from "../HealthLinkClient.module.css";
import { HealthLinkCheckupSection } from "./HealthLinkCheckupSection";
import { HealthLinkMedicationOptionalSection } from "./HealthLinkMedicationOptionalSection";
import { HealthLinkSummaryHero, type SummaryInsightItem } from "./HealthLinkSummaryHero";
import {
  buildMedicationAnalysisModel,
  buildMetricInsightCards,
  buildMetricGroups,
  buildMetricTabs,
  normalizeCompactText,
  type LatestCheckupRow,
  type MetricGroupId,
} from "./HealthLinkResultSection.helpers";

type HealthLinkResultContentProps = {
  latestCheckupRows: LatestCheckupRow[];
  latestCheckupMeta: LatestCheckupMeta;
  medicationDigest: MedicationDigest;
  aiSummary: NhisAiSummary | null;
};

function toMetricKey(metric: string | null | undefined) {
  if (!metric) return "";
  return metric.replace(/\s+/g, "").toLowerCase();
}

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

  const summaryInsights = React.useMemo<SummaryInsightItem[]>(() => {
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

  const visibleRows =
    activeGroup === "all" ? latestCheckupRows : groupedRows[activeGroup];
  const prioritizedRows =
    activeGroup === "all"
      ? [
          ...visibleRows.filter((row) => row.statusTone === "caution"),
          ...visibleRows.filter((row) => row.statusTone !== "caution"),
        ]
      : visibleRows;

  const summaryInsightMetricKeys = React.useMemo(() => {
    return new Set(
      summaryInsights
        .map((item) => toMetricKey(item.metric))
        .filter((metricKey) => metricKey.length > 0)
    );
  }, [summaryInsights]);

  const collapsedRows = React.useMemo(() => {
    if (activeGroup !== "all") return prioritizedRows;
    const filtered = prioritizedRows.filter((row) => {
      const metricKey = toMetricKey(
        typeof row.metric === "string" ? row.metric : null
      );
      return metricKey ? !summaryInsightMetricKeys.has(metricKey) : true;
    });
    return filtered.length > 0 ? filtered : prioritizedRows;
  }, [activeGroup, prioritizedRows, summaryInsightMetricKeys]);

  const metricVisibleCount = 8;
  const metricRows = showAllMetrics
    ? prioritizedRows
    : collapsedRows.slice(0, metricVisibleCount);
  const hiddenMetricCount = Math.max(prioritizedRows.length - metricRows.length, 0);

  const topMedicineLine = topMedicines
    .map((item) => `${item.label} ${item.count}건`)
    .join(", ");

  return (
    <>
      <HealthLinkSummaryHero
        checkupCount={latestCheckupRows.length}
        cautionCount={cautionRows.length}
        medicationCount={medicationDigest.totalRows}
        showCheckupCount={hasCheckupRows}
        showMedicationCount={showMedicationSection}
        summaryHeadline={summaryHeadline}
        summaryBody={summaryBody}
        summaryRiskLevel={summaryRiskLevel}
        summaryInsights={summaryInsights}
      />

      {hasCheckupRows ? (
        <HealthLinkCheckupSection
          latestCheckupMeta={latestCheckupMeta}
          prioritizedRowsCount={prioritizedRows.length}
          metricTabs={metricTabs}
          activeGroupId={activeGroup}
          onSelectGroup={setActiveGroup}
          metricRows={metricRows}
          hiddenMetricCount={hiddenMetricCount}
          showAllMetrics={showAllMetrics}
          metricVisibleCount={metricVisibleCount}
          onExpand={() => setShowAllMetrics(true)}
          onCollapse={() => setShowAllMetrics(false)}
        />
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
        <HealthLinkMedicationOptionalSection
          totalRows={medicationDigest.totalRows}
          uniqueMedicineCount={medicationDigest.uniqueMedicineCount}
          topMedicineLine={topMedicineLine}
          recentMedications={recentMedications}
        />
      ) : null}
    </>
  );
}
