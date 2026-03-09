"use client";

import type { NhisAiSummary } from "../types";
import { type LatestCheckupMeta, type MedicationDigest } from "../utils";
import styles from "../HealthLinkClient.module.css";
import { HealthLinkCheckupSection } from "./HealthLinkCheckupSection";
import { HealthLinkMedicationOptionalSection } from "./HealthLinkMedicationOptionalSection";
import type { LatestCheckupRow } from "./HealthLinkResultSection.helpers";
import { useHealthLinkResultContentModel } from "./useHealthLinkResultContentModel";

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
  const { checkupSectionModel, medicationModel } =
    useHealthLinkResultContentModel({
      latestCheckupRows,
      medicationDigest,
    });

  return (
    <>
      {checkupSectionModel.hasCheckupRows ? (
        <HealthLinkCheckupSection
          latestCheckupMeta={latestCheckupMeta}
          prioritizedRowsCount={checkupSectionModel.prioritizedRowsCount}
          metricTabs={checkupSectionModel.metricTabs}
          activeGroupId={checkupSectionModel.activeGroupId}
          onSelectGroup={checkupSectionModel.onSelectGroup}
          metricRows={checkupSectionModel.metricRows}
          hiddenMetricCount={checkupSectionModel.hiddenMetricCount}
          showAllMetrics={checkupSectionModel.showAllMetrics}
          metricVisibleCount={checkupSectionModel.metricVisibleCount}
          onExpand={checkupSectionModel.onExpand}
          onCollapse={checkupSectionModel.onCollapse}
        />
      ) : null}

      {medicationModel.medicationOnlyMode ? (
        <section
          className={`${styles.compactSection} ${styles.medicationFocusSection}`}
        >
          <div className={styles.compactHeader}>
            <h3>복약 맞춤 분석</h3>
            <span>최근 1건 기준</span>
          </div>
          <p className={styles.sectionSubText}>
            건강검진 데이터가 없어서 최근 복약 이력 기록을 기준으로 핵심만
            빠르게 정리해드려요.
          </p>

          {medicationModel.medicationAnalysis.latestMedication ? (
            <article className={styles.medicationHeroCard}>
              <p className={styles.medicationHeroKicker}>가장 최근 복약</p>
              <strong className={styles.medicationHeroMedicine}>
                {medicationModel.medicationAnalysis.latestMedication.medicine}
              </strong>
              <p className={styles.medicationHeroMeta}>
                {medicationModel.latestMedicationDateLabel}
              </p>
              <p className={styles.medicationHeroPurpose}>
                {medicationModel.latestMedicationPurposeLabel}
              </p>
            </article>
          ) : null}

          <div className={styles.medicationSummaryGrid}>
            {medicationModel.medicationAnalysis.summaryItems.map((item) => (
              <article key={item.label} className={styles.medicationSummaryCard}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className={styles.medicationInsightList}>
            {medicationModel.medicationAnalysis.insights.map((insight, index) => (
              <p key={`${insight}-${index}`}>{insight}</p>
            ))}
          </div>

          <ul className={styles.medicationActionList}>
            {medicationModel.medicationAnalysis.nextActions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {medicationModel.showMedicationSection &&
      !medicationModel.medicationOnlyMode ? (
        <HealthLinkMedicationOptionalSection
          totalRows={medicationDigest.totalRows}
          uniqueMedicineCount={medicationDigest.uniqueMedicineCount}
          topMedicineLine={medicationModel.topMedicineLine}
          recentMedications={medicationModel.recentMedications}
        />
      ) : null}
    </>
  );
}
