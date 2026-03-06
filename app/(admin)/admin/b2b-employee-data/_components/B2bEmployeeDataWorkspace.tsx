import styles from "@/components/b2b/B2bUx.module.css";
import type { DeleteRecordType, EmployeeOpsResponse } from "../_lib/client-types";
import { EMPLOYEE_DATA_COPY } from "../_lib/employee-data-copy";
import B2bEmployeeDataHealthLinkDetails from "./B2bEmployeeDataHealthLinkDetails";
import B2bEmployeeDataOperationsSection from "./B2bEmployeeDataOperationsSection";
import B2bEmployeeDataProfileSection from "./B2bEmployeeDataProfileSection";
import B2bEmployeeDataSummarySection from "./B2bEmployeeDataSummarySection";
import RecordListSection, { type RecordListRow } from "./RecordListSection";

type B2bEmployeeDataWorkspaceProps = {
  opsData: EmployeeOpsResponse | null;
  busy: boolean;
  editName: string;
  editBirthDate: string;
  editPhone: string;
  editAppUserId: string;
  editProvider: string;
  periodResetKey: string;
  deleteConfirmName: string;
  includeAccessLogs: boolean;
  includeAdminLogs: boolean;
  clearLink: boolean;
  clearFetchCache: boolean;
  clearFetchAttempts: boolean;
  recordSections: Array<{ title: string; rows: RecordListRow[] }>;
  healthLinkRows: { fetchCaches: RecordListRow[]; fetchAttempts: RecordListRow[] } | null;
  onEditNameChange: (value: string) => void;
  onEditBirthDateChange: (value: string) => void;
  onEditPhoneChange: (value: string) => void;
  onEditAppUserIdChange: (value: string) => void;
  onEditProviderChange: (value: string) => void;
  onPeriodResetKeyChange: (value: string) => void;
  onDeleteConfirmNameChange: (value: string) => void;
  onIncludeAccessLogsChange: (checked: boolean) => void;
  onIncludeAdminLogsChange: (checked: boolean) => void;
  onClearLinkChange: (checked: boolean) => void;
  onClearFetchCacheChange: (checked: boolean) => void;
  onClearFetchAttemptsChange: (checked: boolean) => void;
  onSaveEmployeeProfile: () => void;
  onResetPeriodData: () => void;
  onResetAllData: () => void;
  onClearHyphenCache: () => void;
  onDeleteEmployee: () => void;
  onDeleteRecord: (recordType: DeleteRecordType, recordId: string) => void;
};

export default function B2bEmployeeDataWorkspace({
  opsData,
  busy,
  editName,
  editBirthDate,
  editPhone,
  editAppUserId,
  editProvider,
  periodResetKey,
  deleteConfirmName,
  includeAccessLogs,
  includeAdminLogs,
  clearLink,
  clearFetchCache,
  clearFetchAttempts,
  recordSections,
  healthLinkRows,
  onEditNameChange,
  onEditBirthDateChange,
  onEditPhoneChange,
  onEditAppUserIdChange,
  onEditProviderChange,
  onPeriodResetKeyChange,
  onDeleteConfirmNameChange,
  onIncludeAccessLogsChange,
  onIncludeAdminLogsChange,
  onClearLinkChange,
  onClearFetchCacheChange,
  onClearFetchAttemptsChange,
  onSaveEmployeeProfile,
  onResetPeriodData,
  onResetAllData,
  onClearHyphenCache,
  onDeleteEmployee,
  onDeleteRecord,
}: B2bEmployeeDataWorkspaceProps) {
  return (
    <div className={styles.stack}>
      {!opsData ? (
        <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
          <p className={styles.reportSelectionPlaceholderText}>
            {EMPLOYEE_DATA_COPY.workspace.emptySelection}
          </p>
        </section>
      ) : null}

      {opsData ? (
        <>
          <B2bEmployeeDataProfileSection
            employee={opsData.employee}
            busy={busy}
            editName={editName}
            editBirthDate={editBirthDate}
            editPhone={editPhone}
            editAppUserId={editAppUserId}
            editProvider={editProvider}
            onEditNameChange={onEditNameChange}
            onEditBirthDateChange={onEditBirthDateChange}
            onEditPhoneChange={onEditPhoneChange}
            onEditAppUserIdChange={onEditAppUserIdChange}
            onEditProviderChange={onEditProviderChange}
            onSaveEmployeeProfile={onSaveEmployeeProfile}
          />

          <B2bEmployeeDataOperationsSection
            employeeName={opsData.employee.name}
            busy={busy}
            periodResetKey={periodResetKey}
            deleteConfirmName={deleteConfirmName}
            includeAccessLogs={includeAccessLogs}
            includeAdminLogs={includeAdminLogs}
            clearLink={clearLink}
            clearFetchCache={clearFetchCache}
            clearFetchAttempts={clearFetchAttempts}
            onPeriodResetKeyChange={onPeriodResetKeyChange}
            onDeleteConfirmNameChange={onDeleteConfirmNameChange}
            onIncludeAccessLogsChange={onIncludeAccessLogsChange}
            onIncludeAdminLogsChange={onIncludeAdminLogsChange}
            onClearLinkChange={onClearLinkChange}
            onClearFetchCacheChange={onClearFetchCacheChange}
            onClearFetchAttemptsChange={onClearFetchAttemptsChange}
            onResetPeriodData={onResetPeriodData}
            onResetAllData={onResetAllData}
            onClearHyphenCache={onClearHyphenCache}
            onDeleteEmployee={onDeleteEmployee}
          />

          <B2bEmployeeDataSummarySection summary={opsData.summary} />

          {recordSections.map((section) => (
            <RecordListSection
              key={section.title}
              title={section.title}
              rows={section.rows}
              busy={busy}
              onDeleteRecord={onDeleteRecord}
            />
          ))}

          <B2bEmployeeDataHealthLinkDetails
            healthLink={opsData.healthLink}
            busy={busy}
            healthLinkRows={healthLinkRows}
            onDeleteRecord={onDeleteRecord}
          />
        </>
      ) : null}
    </div>
  );
}
