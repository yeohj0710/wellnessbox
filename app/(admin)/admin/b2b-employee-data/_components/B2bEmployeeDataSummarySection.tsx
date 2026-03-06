import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeOpsResponse } from "../_lib/client-types";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";

type B2bEmployeeDataSummarySectionProps = {
  summary: EmployeeOpsResponse["summary"];
};

export default function B2bEmployeeDataSummarySection({
  summary,
}: B2bEmployeeDataSummarySectionProps) {
  return (
    <section className={styles.sectionCard}>
      <h2 className={styles.sectionTitle}>{EMPLOYEE_DATA_COPY.summary.title}</h2>
      <div className={styles.kvRow}>
        <div className={styles.kvCard}>
          <span className={styles.kvLabel}>{EMPLOYEE_DATA_COPY.summary.healthSnapshotsLabel}</span>
          <span className={styles.kvValue}>{summary.counts.healthSnapshots}</span>
        </div>
        <div className={styles.kvCard}>
          <span className={styles.kvLabel}>{EMPLOYEE_DATA_COPY.summary.surveyResponsesLabel}</span>
          <span className={styles.kvValue}>{summary.counts.surveyResponses}</span>
        </div>
        <div className={styles.kvCard}>
          <span className={styles.kvLabel}>{EMPLOYEE_DATA_COPY.summary.analysisResultsLabel}</span>
          <span className={styles.kvValue}>{summary.counts.analysisResults}</span>
        </div>
        <div className={styles.kvCard}>
          <span className={styles.kvLabel}>{EMPLOYEE_DATA_COPY.summary.pharmacistNotesLabel}</span>
          <span className={styles.kvValue}>{summary.counts.pharmacistNotes}</span>
        </div>
        <div className={styles.kvCard}>
          <span className={styles.kvLabel}>{EMPLOYEE_DATA_COPY.summary.reportsLabel}</span>
          <span className={styles.kvValue}>{summary.counts.reports}</span>
        </div>
        <div className={styles.kvCard}>
          <span className={styles.kvLabel}>{EMPLOYEE_DATA_COPY.summary.fetchCacheLabel}</span>
          <span className={styles.kvValue}>
            {summary.counts.healthFetchCachesValid}/{summary.counts.healthFetchCaches}
          </span>
        </div>
      </div>
      <p className={styles.inlineHint}>
        {EMPLOYEE_DATA_COPY.summary.periodPrefix}:{" "}
        {summary.periods.length > 0 ? summary.periods.join(", ") : EMPLOYEE_DATA_COPY.summary.noPeriod}
      </p>
    </section>
  );
}
