"use client";

import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";

type RecentMedicationItem = {
  date: string;
  medicine: string;
  effect: string | null;
};

type HealthLinkMedicationOptionalSectionProps = {
  totalRows: number;
  uniqueMedicineCount: number;
  topMedicineLine: string;
  recentMedications: RecentMedicationItem[];
};

export function HealthLinkMedicationOptionalSection({
  totalRows,
  uniqueMedicineCount,
  topMedicineLine,
  recentMedications,
}: HealthLinkMedicationOptionalSectionProps) {
  return (
    <details className={styles.optionalSection}>
      <summary>
        <span>{HEALTH_LINK_COPY.result.medicationDetailsSummary}</span>
        <small>{totalRows.toLocaleString("ko-KR")}건</small>
      </summary>
      <div className={styles.optionalSectionBody}>
        <div className={styles.optionalSummaryRow}>
          <span>복약 이력 {totalRows.toLocaleString("ko-KR")}건</span>
          <span>고유 약품 {uniqueMedicineCount.toLocaleString("ko-KR")}종</span>
        </div>
        {topMedicineLine ? (
          <p className={styles.optionalBodyText}>자주 복용한 약: {topMedicineLine}</p>
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
  );
}

