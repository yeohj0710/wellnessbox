import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  clearHyphenCache,
  deleteEmployee,
  deleteRecord,
  resetAllB2bData,
  resetPeriodData,
} from "./api";
import { broadcastEmployeeReportReset } from "@/lib/b2b/employee-report-browser-storage";
import { EMPLOYEE_DATA_COPY, withTemplate } from "./employee-data-copy";
import type { DeleteRecordType, EmployeeOpsResponse } from "./client-types";
import type { B2bEmployeeDataRunBusyAction } from "./use-b2b-employee-data-busy-action";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type UseB2bEmployeeDataDestructiveActionsParams = {
  runBusyAction: B2bEmployeeDataRunBusyAction;
  search: string;
  selectedEmployeeId: string | null;
  opsData: EmployeeOpsResponse | null;
  includeAccessLogs: boolean;
  includeAdminLogs: boolean;
  clearLink: boolean;
  clearFetchCache: boolean;
  clearFetchAttempts: boolean;
  periodResetKey: string;
  deleteConfirmName: string;
  loadEmployeeList: (query?: string) => Promise<void>;
  refreshCurrentEmployee: () => Promise<void>;
  setOpsData: Dispatch<SetStateAction<EmployeeOpsResponse | null>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function useB2bEmployeeDataDestructiveActions({
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
  loadEmployeeList,
  refreshCurrentEmployee,
  setOpsData,
  setError,
}: UseB2bEmployeeDataDestructiveActionsParams) {
  const handleResetAllData = useCallback(async () => {
    if (!selectedEmployeeId) return;
    const confirmed = window.confirm(EMPLOYEE_DATA_COPY.action.resetAllData.confirm);
    if (!confirmed) return;

    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.resetAllData.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.resetAllData.fallbackError,
      clearNotice: true,
      successNotice: EMPLOYEE_DATA_COPY.action.resetAllData.successNotice,
      run: async () => {
        await resetAllB2bData({
          employeeId: selectedEmployeeId,
          includeAccessLogs,
          includeAdminLogs,
        });
        await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      },
    });
  }, [
    includeAccessLogs,
    includeAdminLogs,
    loadEmployeeList,
    refreshCurrentEmployee,
    runBusyAction,
    search,
    selectedEmployeeId,
  ]);

  const handleResetPeriodData = useCallback(async () => {
    if (!selectedEmployeeId) return;
    const periodKey = periodResetKey.trim();
    if (!MONTH_KEY_PATTERN.test(periodKey)) {
      setError(EMPLOYEE_DATA_COPY.action.resetPeriodData.invalidPeriod);
      return;
    }

    const confirmed = window.confirm(
      withTemplate(EMPLOYEE_DATA_COPY.action.resetPeriodData.confirmTemplate, { periodKey })
    );
    if (!confirmed) return;

    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.resetPeriodData.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.resetPeriodData.fallbackError,
      clearNotice: true,
      successNotice: withTemplate(EMPLOYEE_DATA_COPY.action.resetPeriodData.successNoticeTemplate, {
        periodKey,
      }),
      run: async () => {
        await resetPeriodData({ employeeId: selectedEmployeeId, periodKey });
        await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      },
    });
  }, [
    loadEmployeeList,
    periodResetKey,
    refreshCurrentEmployee,
    runBusyAction,
    search,
    selectedEmployeeId,
    setError,
  ]);

  const handleClearHyphenCache = useCallback(async () => {
    if (!selectedEmployeeId) return;
    const confirmed = window.confirm(EMPLOYEE_DATA_COPY.action.clearHyphenCache.confirm);
    if (!confirmed) return;

    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.clearHyphenCache.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.clearHyphenCache.fallbackError,
      clearNotice: true,
      successNotice: EMPLOYEE_DATA_COPY.action.clearHyphenCache.successNotice,
      run: async () => {
        await clearHyphenCache({
          employeeId: selectedEmployeeId,
          clearLink,
          clearFetchCache,
          clearFetchAttempts,
        });
        await refreshCurrentEmployee();
      },
    });
  }, [
    clearFetchAttempts,
    clearFetchCache,
    clearLink,
    refreshCurrentEmployee,
    runBusyAction,
    selectedEmployeeId,
  ]);

  const handleDeleteEmployee = useCallback(async () => {
    if (!selectedEmployeeId || !opsData) return;
    if (deleteConfirmName.trim() !== opsData.employee.name) {
      setError(EMPLOYEE_DATA_COPY.action.deleteEmployee.nameMismatch);
      return;
    }

    const confirmed = window.confirm(
      withTemplate(EMPLOYEE_DATA_COPY.action.deleteEmployee.confirmTemplate, {
        employeeName: opsData.employee.name,
      })
    );
    if (!confirmed) return;

    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.deleteEmployee.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.deleteEmployee.fallbackError,
      clearNotice: true,
      successNotice: EMPLOYEE_DATA_COPY.action.deleteEmployee.successNotice,
      run: async () => {
        await deleteEmployee(selectedEmployeeId, deleteConfirmName.trim());
        broadcastEmployeeReportReset("admin-delete");
        await loadEmployeeList(search.trim());
        setOpsData(null);
      },
    });
  }, [
    deleteConfirmName,
    loadEmployeeList,
    opsData,
    runBusyAction,
    search,
    selectedEmployeeId,
    setError,
    setOpsData,
  ]);

  const handleDeleteRecord = useCallback(
    async (recordType: DeleteRecordType, recordId: string) => {
      if (!selectedEmployeeId) return;
      const confirmed = window.confirm(EMPLOYEE_DATA_COPY.action.deleteRecord.confirm);
      if (!confirmed) return;

      await runBusyAction({
        message: EMPLOYEE_DATA_COPY.action.deleteRecord.message,
        fallbackError: EMPLOYEE_DATA_COPY.action.deleteRecord.fallbackError,
        clearNotice: true,
        successNotice: EMPLOYEE_DATA_COPY.action.deleteRecord.successNotice,
        run: async () => {
          await deleteRecord({
            employeeId: selectedEmployeeId,
            recordType,
            recordId,
          });
          await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
        },
      });
    },
    [
      loadEmployeeList,
      refreshCurrentEmployee,
      runBusyAction,
      search,
      selectedEmployeeId,
    ]
  );

  return {
    handleResetAllData,
    handleResetPeriodData,
    handleClearHyphenCache,
    handleDeleteEmployee,
    handleDeleteRecord,
  };
}
