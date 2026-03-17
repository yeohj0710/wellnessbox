"use client";

import { useMemo, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import type { RecordListRow } from "./_components/RecordListSection";
import B2bEmployeeDataCreateFormCard from "./_components/B2bEmployeeDataCreateFormCard";
import B2bEmployeeDataOpsHero from "./_components/B2bEmployeeDataOpsHero";
import B2bEmployeeDataSidebar from "./_components/B2bEmployeeDataSidebar";
import B2bEmployeeDataWorkspace from "./_components/B2bEmployeeDataWorkspace";
import { EMPLOYEE_DATA_COPY } from "./_lib/employee-data-copy";
import {
  buildEmployeeRecordRowsByGroup,
  buildHealthLinkRecordRows,
} from "./_lib/record-row-builders";
import { useB2bEmployeeDataActions } from "./_lib/use-b2b-employee-data-actions";
import { useB2bEmployeeDataBusyAction } from "./_lib/use-b2b-employee-data-busy-action";
import { useB2bEmployeeDataForms } from "./_lib/use-b2b-employee-data-forms";
import { useB2bEmployeeDataSelectionLifecycle } from "./_lib/use-b2b-employee-data-selection-lifecycle";

export default function B2bAdminEmployeeDataClient() {
  const [search, setSearch] = useState("");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [includeAccessLogs, setIncludeAccessLogs] = useState(false);
  const [includeAdminLogs, setIncludeAdminLogs] = useState(false);
  const [clearLink, setClearLink] = useState(true);
  const [clearFetchCache, setClearFetchCache] = useState(true);
  const [clearFetchAttempts, setClearFetchAttempts] = useState(true);

  const { busy, busyMessage, runBusyAction } = useB2bEmployeeDataBusyAction({
    setError,
    setNotice,
  });
  const {
    createName,
    createBirthDate,
    createPhone,
    createAppUserId,
    createProvider,
    editName,
    editBirthDate,
    editPhone,
    editAppUserId,
    editProvider,
    periodResetKey,
    deleteConfirmName,
    setCreateName,
    setCreateBirthDateDigits,
    setCreatePhoneDigits,
    setCreateAppUserId,
    setCreateProvider,
    setEditName,
    setEditBirthDateDigits,
    setEditPhoneDigits,
    setEditAppUserId,
    setEditProvider,
    setPeriodResetKey,
    setDeleteConfirmName,
    hydrateEditorFromOps,
    resetCreateForm,
    toCreatePayload,
    toEditPayload,
  } = useB2bEmployeeDataForms();

  const {
    employees,
    selectedEmployeeId,
    opsData,
    setSelectedEmployeeId,
    setOpsData,
    loadEmployeeList,
    refreshCurrentEmployee,
  } = useB2bEmployeeDataSelectionLifecycle({
    runBusyAction,
    onHydrateFromOps: hydrateEditorFromOps,
  });
  const {
    handleSearch,
    handleCreateEmployee,
    handleSaveEmployeeProfile,
    handleResetAllData,
    handleResetPeriodData,
    handleClearHyphenCache,
    handleDeleteEmployee,
    handleDeleteRecord,
    handleRefreshOpsData,
  } = useB2bEmployeeDataActions({
    runBusyAction,
    search,
    selectedEmployeeId,
    opsData,
    includeAccessLogs,
    includeAdminLogs,
    clearLink,
    clearFetchCache,
    clearFetchAttempts,
    periodResetKey,
    deleteConfirmName,
    toCreatePayload,
    toEditPayload,
    resetCreateForm,
    loadEmployeeList,
    refreshCurrentEmployee,
    setSelectedEmployeeId,
    setOpsData,
    setError,
  });

  const recordRowsByGroup = useMemo(
    () => (opsData ? buildEmployeeRecordRowsByGroup(opsData) : null),
    [opsData]
  );

  const healthLinkRows = useMemo(() => (opsData ? buildHealthLinkRecordRows(opsData) : null), [opsData]);

  const recordSections = useMemo<Array<{ title: string; rows: RecordListRow[] }>>(() => {
    if (!recordRowsByGroup) return [];
    return [
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.healthSnapshots,
        rows: recordRowsByGroup.healthSnapshots,
      },
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.surveyResponses,
        rows: recordRowsByGroup.surveyResponses,
      },
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.analysisResults,
        rows: recordRowsByGroup.analysisResults,
      },
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.pharmacistNotes,
        rows: recordRowsByGroup.pharmacistNotes,
      },
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.reports,
        rows: recordRowsByGroup.reports,
      },
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.accessLogs,
        rows: recordRowsByGroup.accessLogs,
      },
      {
        title: EMPLOYEE_DATA_COPY.sectionTitle.adminActionLogs,
        rows: recordRowsByGroup.adminActionLogs,
      },
    ];
  }, [recordRowsByGroup]);

  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.reportPage} ${styles.pageNoBg} ${styles.stack}`}>
        <B2bEmployeeDataOpsHero
          search={search}
          busy={busy}
          busyMessage={busyMessage}
          onSearchChange={setSearch}
          onSearchSubmit={() => void handleSearch()}
          onRefresh={() => void handleRefreshOpsData()}
        />

        {error ? <div className={styles.noticeError}>{error}</div> : null}
        {notice ? <div className={styles.noticeSuccess}>{notice}</div> : null}

        <B2bEmployeeDataCreateFormCard
          busy={busy}
          createName={createName}
          createBirthDate={createBirthDate}
          createPhone={createPhone}
          createAppUserId={createAppUserId}
          createProvider={createProvider}
          onCreateNameChange={setCreateName}
          onCreateBirthDateChange={setCreateBirthDateDigits}
          onCreatePhoneChange={setCreatePhoneDigits}
          onCreateAppUserIdChange={setCreateAppUserId}
          onCreateProviderChange={setCreateProvider}
          onCreateEmployee={() => void handleCreateEmployee()}
        />

        <div className={styles.splitLayout}>
          <B2bEmployeeDataSidebar
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            busy={busy}
            onSelectEmployee={setSelectedEmployeeId}
          />

          <B2bEmployeeDataWorkspace
            opsData={opsData}
            busy={busy}
            editName={editName}
            editBirthDate={editBirthDate}
            editPhone={editPhone}
            editAppUserId={editAppUserId}
            editProvider={editProvider}
            periodResetKey={periodResetKey}
            deleteConfirmName={deleteConfirmName}
            includeAccessLogs={includeAccessLogs}
            includeAdminLogs={includeAdminLogs}
            clearLink={clearLink}
            clearFetchCache={clearFetchCache}
            clearFetchAttempts={clearFetchAttempts}
            recordSections={recordSections}
            healthLinkRows={healthLinkRows}
            onEditNameChange={setEditName}
            onEditBirthDateChange={setEditBirthDateDigits}
            onEditPhoneChange={setEditPhoneDigits}
            onEditAppUserIdChange={setEditAppUserId}
            onEditProviderChange={setEditProvider}
            onPeriodResetKeyChange={setPeriodResetKey}
            onDeleteConfirmNameChange={setDeleteConfirmName}
            onIncludeAccessLogsChange={setIncludeAccessLogs}
            onIncludeAdminLogsChange={setIncludeAdminLogs}
            onClearLinkChange={setClearLink}
            onClearFetchCacheChange={setClearFetchCache}
            onClearFetchAttemptsChange={setClearFetchAttempts}
            onSaveEmployeeProfile={() => void handleSaveEmployeeProfile()}
            onResetPeriodData={() => void handleResetPeriodData()}
            onResetAllData={() => void handleResetAllData()}
            onClearHyphenCache={() => void handleClearHyphenCache()}
            onDeleteEmployee={() => void handleDeleteEmployee()}
            onDeleteRecord={handleDeleteRecord}
          />
        </div>
      </div>
    </div>
  );
}
