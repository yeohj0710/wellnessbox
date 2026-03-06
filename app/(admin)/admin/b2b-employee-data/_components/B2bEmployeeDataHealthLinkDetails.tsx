import styles from "@/components/b2b/B2bUx.module.css";
import type { DeleteRecordType, EmployeeOpsResponse } from "../_lib/client-types";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";
import RecordListSection, { type RecordListRow } from "./RecordListSection";

type B2bEmployeeDataHealthLinkDetailsProps = {
  healthLink: EmployeeOpsResponse["healthLink"];
  busy: boolean;
  healthLinkRows: { fetchCaches: RecordListRow[]; fetchAttempts: RecordListRow[] } | null;
  onDeleteRecord: (recordType: DeleteRecordType, recordId: string) => void;
};

export default function B2bEmployeeDataHealthLinkDetails({
  healthLink,
  busy,
  healthLinkRows,
  onDeleteRecord,
}: B2bEmployeeDataHealthLinkDetailsProps) {
  return (
    <details className={styles.optionalCard}>
      <summary>{EMPLOYEE_DATA_COPY.healthLink.summary}</summary>
      <div className={styles.optionalBody}>
        {healthLink ? (
          <>
            <RecordListSection
              title={EMPLOYEE_DATA_COPY.healthLink.fetchCachesTitle}
              rows={healthLinkRows?.fetchCaches ?? []}
              busy={busy}
              onDeleteRecord={onDeleteRecord}
            />
            <RecordListSection
              title={EMPLOYEE_DATA_COPY.healthLink.fetchAttemptsTitle}
              rows={healthLinkRows?.fetchAttempts ?? []}
              busy={busy}
              onDeleteRecord={onDeleteRecord}
            />
          </>
        ) : (
          <p className={styles.noticeInfo}>{EMPLOYEE_DATA_COPY.healthLink.empty}</p>
        )}
      </div>
    </details>
  );
}
