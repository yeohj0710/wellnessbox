import type { Dispatch, SetStateAction } from "react";
import { createEmployee, patchEmployee } from "./api";
import type { DeleteRecordType, EmployeeOpsResponse } from "./client-types";
import { useB2bEmployeeDataDestructiveActions } from "./use-b2b-employee-data-destructive-actions";
import { useB2bEmployeeDataEmployeeOpsActions } from "./use-b2b-employee-data-employee-ops-actions";
import type { B2bEmployeeDataRunBusyAction } from "./use-b2b-employee-data-busy-action";

type UseB2bEmployeeDataActionsParams = {
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
  toCreatePayload: () => Parameters<typeof createEmployee>[0];
  toEditPayload: () => Parameters<typeof patchEmployee>[1];
  resetCreateForm: () => void;
  loadEmployeeList: (query?: string) => Promise<void>;
  refreshCurrentEmployee: () => Promise<void>;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  setOpsData: Dispatch<SetStateAction<EmployeeOpsResponse | null>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function useB2bEmployeeDataActions({
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
}: UseB2bEmployeeDataActionsParams) {
  const employeeOpsActions = useB2bEmployeeDataEmployeeOpsActions({
    runBusyAction,
    search,
    selectedEmployeeId,
    toCreatePayload,
    toEditPayload,
    resetCreateForm,
    loadEmployeeList,
    refreshCurrentEmployee,
    setSelectedEmployeeId,
  });

  const destructiveActions = useB2bEmployeeDataDestructiveActions({
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
  });

  return {
    ...employeeOpsActions,
    ...destructiveActions,
  };
}

export type B2bEmployeeDataActionHandlers = {
  handleSearch: () => Promise<void>;
  handleCreateEmployee: () => Promise<void>;
  handleSaveEmployeeProfile: () => Promise<void>;
  handleRefreshOpsData: () => Promise<void>;
  handleResetAllData: () => Promise<void>;
  handleResetPeriodData: () => Promise<void>;
  handleClearHyphenCache: () => Promise<void>;
  handleDeleteEmployee: () => Promise<void>;
  handleDeleteRecord: (recordType: DeleteRecordType, recordId: string) => Promise<void>;
};
