"use client";

import React from "react";
import type { NhisAiSummary } from "../types";
import {
  resolveMetricDisplayValue,
  type LatestCheckupMeta,
  type MedicationDigest,
} from "../utils";
import styles from "../HealthLinkClient.module.css";
import { HealthLinkCheckupSection } from "./HealthLinkCheckupSection";
import { HealthLinkMedicationOptionalSection } from "./HealthLinkMedicationOptionalSection";
import {
  buildMedicationAnalysisModel,
  buildMetricGroups,
  buildMetricTabs,
  normalizeCompactText,
  shouldHideMetricTone,
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
  aiSummary: _aiSummary,
}: HealthLinkResultContentProps) {
  const sanitizedCheckupRows = React.useMemo(
    () =>
      latestCheckupRows.filter((row) => {
        const metric = typeof row.metric === "string" ? row.metric.trim() : "";
        if (!metric || shouldHideMetricTone(metric)) return false;
        return resolveMetricDisplayValue(row) !== null;
      }),
    [latestCheckupRows]
  );
  const hasCheckupRows = sanitizedCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
  const showMedicationSection = hasMedicationRows || !hasCheckupRows;
  const cautionRows = sanitizedCheckupRows.filter(
    (row) => row.statusTone === "caution"
  );
  const topMedicines = medicationDigest.topMedicines.slice(0, 3);
  const recentMedications = medicationDigest.recentMedications.slice(0, 3);
  const medicationOnlyMode = !hasCheckupRows && hasMedicationRows;
  const medicationAnalysis = React.useMemo(
    () => buildMedicationAnalysisModel(medicationDigest),
    [medicationDigest]
  );

  const groupedRows = React.useMemo(
    () => buildMetricGroups(sanitizedCheckupRows),
    [sanitizedCheckupRows]
  );

  const metricTabs = React.useMemo(
    () => buildMetricTabs(groupedRows, sanitizedCheckupRows.length),
    [groupedRows, sanitizedCheckupRows.length]
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
    activeGroup === "all" ? sanitizedCheckupRows : groupedRows[activeGroup];
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
  const hiddenMetricCount = Math.max(prioritizedRows.length - metricRows.length, 0);

  const topMedicineLine = topMedicines
    .map((item) => `${item.label} ${item.count}건`)
    .join(", ");

  return (
    <>
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
