import styles from "@/components/b2b/B2bUx.module.css";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";

type B2bEmployeeDataOperationsSectionProps = {
  employeeName: string;
  busy: boolean;
  periodResetKey: string;
  deleteConfirmName: string;
  includeAccessLogs: boolean;
  includeAdminLogs: boolean;
  clearLink: boolean;
  clearFetchCache: boolean;
  clearFetchAttempts: boolean;
  onPeriodResetKeyChange: (value: string) => void;
  onDeleteConfirmNameChange: (value: string) => void;
  onIncludeAccessLogsChange: (checked: boolean) => void;
  onIncludeAdminLogsChange: (checked: boolean) => void;
  onClearLinkChange: (checked: boolean) => void;
  onClearFetchCacheChange: (checked: boolean) => void;
  onClearFetchAttemptsChange: (checked: boolean) => void;
  onResetPeriodData: () => void;
  onResetAllData: () => void;
  onClearHyphenCache: () => void;
  onDeleteEmployee: () => void;
};

export default function B2bEmployeeDataOperationsSection({
  employeeName,
  busy,
  periodResetKey,
  deleteConfirmName,
  includeAccessLogs,
  includeAdminLogs,
  clearLink,
  clearFetchCache,
  clearFetchAttempts,
  onPeriodResetKeyChange,
  onDeleteConfirmNameChange,
  onIncludeAccessLogsChange,
  onIncludeAdminLogsChange,
  onClearLinkChange,
  onClearFetchCacheChange,
  onClearFetchAttemptsChange,
  onResetPeriodData,
  onResetAllData,
  onClearHyphenCache,
  onDeleteEmployee,
}: B2bEmployeeDataOperationsSectionProps) {
  return (
    <section className={styles.sectionCard}>
      <h2 className={styles.sectionTitle}>{EMPLOYEE_DATA_COPY.operations.title}</h2>
      <div className={styles.actionRow}>
        <input
          type="month"
          className={styles.input}
          value={periodResetKey}
          onChange={(event) => onPeriodResetKeyChange(event.target.value)}
          disabled={busy}
        />
        <button type="button" className={styles.buttonGhost} onClick={onResetPeriodData} disabled={busy}>
          {EMPLOYEE_DATA_COPY.operations.resetPeriodButton}
        </button>
        <button type="button" className={styles.buttonDanger} onClick={onResetAllData} disabled={busy}>
          {EMPLOYEE_DATA_COPY.operations.resetAllButton}
        </button>
      </div>
      <div className={styles.actionRow}>
        <label className={styles.inlineHint}>
          <input
            type="checkbox"
            checked={includeAccessLogs}
            onChange={(event) => onIncludeAccessLogsChange(event.target.checked)}
            disabled={busy}
          />{" "}
          {EMPLOYEE_DATA_COPY.operations.includeAccessLogs}
        </label>
        <label className={styles.inlineHint}>
          <input
            type="checkbox"
            checked={includeAdminLogs}
            onChange={(event) => onIncludeAdminLogsChange(event.target.checked)}
            disabled={busy}
          />{" "}
          {EMPLOYEE_DATA_COPY.operations.includeAdminLogs}
        </label>
      </div>
      <div className={styles.actionRow}>
        <label className={styles.inlineHint}>
          <input
            type="checkbox"
            checked={clearLink}
            onChange={(event) => onClearLinkChange(event.target.checked)}
            disabled={busy}
          />{" "}
          {EMPLOYEE_DATA_COPY.operations.clearLink}
        </label>
        <label className={styles.inlineHint}>
          <input
            type="checkbox"
            checked={clearFetchCache}
            onChange={(event) => onClearFetchCacheChange(event.target.checked)}
            disabled={busy}
          />{" "}
          {EMPLOYEE_DATA_COPY.operations.clearFetchCache}
        </label>
        <label className={styles.inlineHint}>
          <input
            type="checkbox"
            checked={clearFetchAttempts}
            onChange={(event) => onClearFetchAttemptsChange(event.target.checked)}
            disabled={busy}
          />{" "}
          {EMPLOYEE_DATA_COPY.operations.clearFetchAttempts}
        </label>
        <button type="button" className={styles.buttonSecondary} onClick={onClearHyphenCache} disabled={busy}>
          {EMPLOYEE_DATA_COPY.operations.clearHyphenCacheButton}
        </button>
      </div>
      <div className={styles.optionalCard}>
        <p className={styles.optionalText}>{EMPLOYEE_DATA_COPY.operations.deleteGuide}</p>
        <div className={styles.actionRow}>
          <input
            className={styles.input}
            value={deleteConfirmName}
            onChange={(event) => onDeleteConfirmNameChange(event.target.value)}
            placeholder={`${EMPLOYEE_DATA_COPY.operations.deleteConfirmPlaceholderPrefix}: ${employeeName}`}
            disabled={busy}
            style={{ minWidth: 240 }}
          />
          <button type="button" className={styles.buttonDanger} onClick={onDeleteEmployee} disabled={busy}>
            {EMPLOYEE_DATA_COPY.operations.deleteEmployeeButton}
          </button>
        </div>
      </div>
    </section>
  );
}
