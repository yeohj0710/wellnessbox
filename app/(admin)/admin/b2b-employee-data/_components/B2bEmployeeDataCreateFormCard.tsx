import styles from "@/components/b2b/B2bUx.module.css";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";

type B2bEmployeeDataCreateFormCardProps = {
  busy: boolean;
  createName: string;
  createBirthDate: string;
  createPhone: string;
  createAppUserId: string;
  createProvider: string;
  onCreateNameChange: (value: string) => void;
  onCreateBirthDateChange: (value: string) => void;
  onCreatePhoneChange: (value: string) => void;
  onCreateAppUserIdChange: (value: string) => void;
  onCreateProviderChange: (value: string) => void;
  onCreateEmployee: () => void;
};

export default function B2bEmployeeDataCreateFormCard({
  busy,
  createName,
  createBirthDate,
  createPhone,
  createAppUserId,
  createProvider,
  onCreateNameChange,
  onCreateBirthDateChange,
  onCreatePhoneChange,
  onCreateAppUserIdChange,
  onCreateProviderChange,
  onCreateEmployee,
}: B2bEmployeeDataCreateFormCardProps) {
  return (
    <details className={styles.optionalCard}>
      <summary>{EMPLOYEE_DATA_COPY.createForm.summary}</summary>
      <div className={styles.optionalBody}>
        <div className={styles.formGrid}>
          <input
            className={styles.input}
            value={createName}
            onChange={(event) => onCreateNameChange(event.target.value)}
            placeholder={EMPLOYEE_DATA_COPY.createForm.namePlaceholder}
            disabled={busy}
          />
          <input
            className={styles.input}
            value={createBirthDate}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(event) => onCreateBirthDateChange(event.target.value)}
            placeholder={EMPLOYEE_DATA_COPY.createForm.birthDatePlaceholder}
            maxLength={8}
            disabled={busy}
          />
          <input
            className={styles.input}
            value={createPhone}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(event) => onCreatePhoneChange(event.target.value)}
            placeholder={EMPLOYEE_DATA_COPY.createForm.phonePlaceholder}
            maxLength={11}
            disabled={busy}
          />
        </div>
        <div className={styles.formGrid}>
          <input
            className={styles.input}
            value={createAppUserId}
            onChange={(event) => onCreateAppUserIdChange(event.target.value)}
            placeholder={EMPLOYEE_DATA_COPY.createForm.appUserIdPlaceholder}
            disabled={busy}
          />
          <input
            className={styles.input}
            value={createProvider}
            onChange={(event) => onCreateProviderChange(event.target.value)}
            placeholder={EMPLOYEE_DATA_COPY.createForm.providerPlaceholder}
            disabled={busy}
          />
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={onCreateEmployee}
            disabled={busy}
          >
            {EMPLOYEE_DATA_COPY.createForm.submitLabel}
          </button>
        </div>
      </div>
    </details>
  );
}
