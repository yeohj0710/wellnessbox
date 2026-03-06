import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeOpsResponse } from "../_lib/client-types";
import { formatDateTime } from "../_lib/client-utils";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";

type B2bEmployeeDataProfileSectionProps = {
  employee: EmployeeOpsResponse["employee"];
  busy: boolean;
  editName: string;
  editBirthDate: string;
  editPhone: string;
  editAppUserId: string;
  editProvider: string;
  onEditNameChange: (value: string) => void;
  onEditBirthDateChange: (value: string) => void;
  onEditPhoneChange: (value: string) => void;
  onEditAppUserIdChange: (value: string) => void;
  onEditProviderChange: (value: string) => void;
  onSaveEmployeeProfile: () => void;
};

export default function B2bEmployeeDataProfileSection({
  employee,
  busy,
  editName,
  editBirthDate,
  editPhone,
  editAppUserId,
  editProvider,
  onEditNameChange,
  onEditBirthDateChange,
  onEditPhoneChange,
  onEditAppUserIdChange,
  onEditProviderChange,
  onSaveEmployeeProfile,
}: B2bEmployeeDataProfileSectionProps) {
  return (
    <section className={styles.sectionCard}>
      <h2 className={styles.sectionTitle}>
        {employee.name} ({employee.birthDate})
      </h2>
      <p className={styles.sectionDescription}>
        {EMPLOYEE_DATA_COPY.profile.syncPrefix}: {formatDateTime(employee.lastSyncedAt)} ·{" "}
        {EMPLOYEE_DATA_COPY.profile.viewedPrefix}: {formatDateTime(employee.lastViewedAt)}
      </p>
      <div className={styles.formGrid}>
        <input
          className={styles.input}
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
          placeholder={EMPLOYEE_DATA_COPY.profile.namePlaceholder}
          disabled={busy}
        />
        <input
          className={styles.input}
          value={editBirthDate}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(event) => onEditBirthDateChange(event.target.value)}
          placeholder={EMPLOYEE_DATA_COPY.profile.birthDatePlaceholder}
          maxLength={8}
          disabled={busy}
        />
        <input
          className={styles.input}
          value={editPhone}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(event) => onEditPhoneChange(event.target.value)}
          placeholder={EMPLOYEE_DATA_COPY.profile.phonePlaceholder}
          maxLength={11}
          disabled={busy}
        />
      </div>
      <div className={styles.formGrid}>
        <input
          className={styles.input}
          value={editAppUserId}
          onChange={(event) => onEditAppUserIdChange(event.target.value)}
          placeholder={EMPLOYEE_DATA_COPY.profile.appUserIdPlaceholder}
          disabled={busy}
        />
        <input
          className={styles.input}
          value={editProvider}
          onChange={(event) => onEditProviderChange(event.target.value)}
          placeholder={EMPLOYEE_DATA_COPY.profile.providerPlaceholder}
          disabled={busy}
        />
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={onSaveEmployeeProfile}
          disabled={busy}
        >
          {EMPLOYEE_DATA_COPY.profile.saveButton}
        </button>
      </div>
    </section>
  );
}
