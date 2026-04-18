"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import B2bEmployeeDataCreateFormCard from "../../b2b-employee-data/_components/B2bEmployeeDataCreateFormCard";
import B2bEmployeeDataWorkspace from "../../b2b-employee-data/_components/B2bEmployeeDataWorkspace";
import type { RecordListRow } from "../../b2b-employee-data/_components/RecordListSection";
import { fetchEmployeeOps } from "../../b2b-employee-data/_lib/api";
import type { EmployeeOpsResponse } from "../../b2b-employee-data/_lib/client-types";
import { EMPLOYEE_DATA_COPY } from "../../b2b-employee-data/_lib/employee-data-copy";
import {
  buildEmployeeRecordRowsByGroup,
  buildHealthLinkRecordRows,
} from "../../b2b-employee-data/_lib/record-row-builders";
import { useB2bEmployeeDataActions } from "../../b2b-employee-data/_lib/use-b2b-employee-data-actions";
import { useB2bEmployeeDataBusyAction } from "../../b2b-employee-data/_lib/use-b2b-employee-data-busy-action";
import { useB2bEmployeeDataForms } from "../../b2b-employee-data/_lib/use-b2b-employee-data-forms";

type B2bAdminEmployeeManagementPanelProps = {
  searchQuery: string;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  loadEmployees: (query?: string) => Promise<void>;
  embedded?: boolean;
};

export default function B2bAdminEmployeeManagementPanel({
  searchQuery,
  selectedEmployeeId,
  setSelectedEmployeeId,
  loadEmployees,
  embedded = false,
}: B2bAdminEmployeeManagementPanelProps) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [opsData, setOpsData] = useState<EmployeeOpsResponse | null>(null);
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

  const loadEmployeeOps = useCallback(
    async (employeeId: string) => {
      const detail = await fetchEmployeeOps(employeeId);
      setOpsData(detail);
      hydrateEditorFromOps(detail);
    },
    [hydrateEditorFromOps]
  );

  const refreshCurrentEmployee = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await loadEmployeeOps(selectedEmployeeId);
  }, [loadEmployeeOps, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setOpsData(null);
      return;
    }

    void runBusyAction({
      message: "선택한 직원 운영 데이터를 불러오고 있습니다.",
      fallbackError: "직원 운영 데이터 조회에 실패했습니다.",
      run: async () => {
        await loadEmployeeOps(selectedEmployeeId);
      },
    });
  }, [loadEmployeeOps, runBusyAction, selectedEmployeeId]);

  const {
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
    search: searchQuery,
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
    loadEmployeeList: loadEmployees,
    refreshCurrentEmployee,
    setSelectedEmployeeId,
    setOpsData,
    setError,
  });

  const recordRowsByGroup = useMemo(
    () => (opsData ? buildEmployeeRecordRowsByGroup(opsData) : null),
    [opsData]
  );
  const healthLinkRows = useMemo(
    () => (opsData ? buildHealthLinkRecordRows(opsData) : null),
    [opsData]
  );
  const recordSections = useMemo<Array<{ title: string; rows: RecordListRow[] }>>(() => {
    if (!recordRowsByGroup) return [];
    return [
      { title: EMPLOYEE_DATA_COPY.sectionTitle.healthSnapshots, rows: recordRowsByGroup.healthSnapshots },
      { title: EMPLOYEE_DATA_COPY.sectionTitle.surveyResponses, rows: recordRowsByGroup.surveyResponses },
      { title: EMPLOYEE_DATA_COPY.sectionTitle.analysisResults, rows: recordRowsByGroup.analysisResults },
      { title: EMPLOYEE_DATA_COPY.sectionTitle.pharmacistNotes, rows: recordRowsByGroup.pharmacistNotes },
      { title: EMPLOYEE_DATA_COPY.sectionTitle.reports, rows: recordRowsByGroup.reports },
      { title: EMPLOYEE_DATA_COPY.sectionTitle.accessLogs, rows: recordRowsByGroup.accessLogs },
      { title: EMPLOYEE_DATA_COPY.sectionTitle.adminActionLogs, rows: recordRowsByGroup.adminActionLogs },
    ];
  }, [recordRowsByGroup]);

  const summaryMeta = busy
    ? busyMessage || "직원 데이터 작업 중"
    : opsData
      ? `건강 스냅샷 ${opsData.summary.counts.healthSnapshots}건 · 리포트 ${opsData.summary.counts.reports}건`
      : "직원 선택 후 프로필 수정 · 레코드 정리 · 연동 캐시 초기화";

  const panelBody = (
    <>
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

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={() => void handleRefreshOpsData()}
          disabled={busy || !selectedEmployeeId}
        >
          직원 데이터 새로고침
        </button>
      </div>

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
        onDeleteRecord={(recordType, recordId) => {
          void handleDeleteRecord(recordType, recordId);
        }}
      />
    </>
  );

  if (embedded) {
    return <div className={styles.adminEmbeddedPanel}>{panelBody}</div>;
  }

  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>직원 데이터 관리</span>
        <span className={styles.editorPanelSummaryMeta}>{summaryMeta}</span>
      </summary>
      <div className={styles.editorPanelMotion}>
        <div className={styles.editorPanelBody}>{panelBody}</div>
      </div>
    </details>
  );
}
