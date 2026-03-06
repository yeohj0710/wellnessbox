import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createEmployee, patchEmployee } from "./api";
import { EMPLOYEE_DATA_COPY } from "./employee-data-copy";
import type { B2bEmployeeDataRunBusyAction } from "./use-b2b-employee-data-busy-action";

type UseB2bEmployeeDataEmployeeOpsActionsParams = {
  runBusyAction: B2bEmployeeDataRunBusyAction;
  search: string;
  selectedEmployeeId: string | null;
  toCreatePayload: () => Parameters<typeof createEmployee>[0];
  toEditPayload: () => Parameters<typeof patchEmployee>[1];
  resetCreateForm: () => void;
  loadEmployeeList: (query?: string) => Promise<void>;
  refreshCurrentEmployee: () => Promise<void>;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
};

export function useB2bEmployeeDataEmployeeOpsActions({
  runBusyAction,
  search,
  selectedEmployeeId,
  toCreatePayload,
  toEditPayload,
  resetCreateForm,
  loadEmployeeList,
  refreshCurrentEmployee,
  setSelectedEmployeeId,
}: UseB2bEmployeeDataEmployeeOpsActionsParams) {
  const handleSearch = useCallback(async () => {
    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.search.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.search.fallbackError,
      clearNotice: true,
      successNotice: EMPLOYEE_DATA_COPY.action.search.successNotice,
      run: async () => {
        await loadEmployeeList(search.trim());
      },
    });
  }, [loadEmployeeList, runBusyAction, search]);

  const handleCreateEmployee = useCallback(async () => {
    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.createEmployee.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.createEmployee.fallbackError,
      clearNotice: true,
      successNotice: EMPLOYEE_DATA_COPY.action.createEmployee.successNotice,
      run: async () => {
        const created = await createEmployee(toCreatePayload());
        await loadEmployeeList(search.trim());
        setSelectedEmployeeId(created.employee.id);
        resetCreateForm();
      },
    });
  }, [
    loadEmployeeList,
    resetCreateForm,
    runBusyAction,
    search,
    setSelectedEmployeeId,
    toCreatePayload,
  ]);

  const handleSaveEmployeeProfile = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.saveEmployeeProfile.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.saveEmployeeProfile.fallbackError,
      clearNotice: true,
      successNotice: EMPLOYEE_DATA_COPY.action.saveEmployeeProfile.successNotice,
      run: async () => {
        await patchEmployee(selectedEmployeeId, toEditPayload());
        await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      },
    });
  }, [
    loadEmployeeList,
    refreshCurrentEmployee,
    runBusyAction,
    search,
    selectedEmployeeId,
    toEditPayload,
  ]);

  const handleRefreshOpsData = useCallback(async () => {
    await runBusyAction({
      message: EMPLOYEE_DATA_COPY.action.refreshOpsData.message,
      fallbackError: EMPLOYEE_DATA_COPY.action.refreshOpsData.fallbackError,
      clearNotice: false,
      successNotice: EMPLOYEE_DATA_COPY.action.refreshOpsData.successNotice,
      run: async () => {
        await Promise.all([loadEmployeeList(search.trim()), refreshCurrentEmployee()]);
      },
    });
  }, [loadEmployeeList, refreshCurrentEmployee, runBusyAction, search]);

  return {
    handleSearch,
    handleCreateEmployee,
    handleSaveEmployeeProfile,
    handleRefreshOpsData,
  };
}
