import { useCallback, useEffect, useState } from "react";
import { fetchEmployeeOps, fetchEmployees } from "./api";
import type { EmployeeListItem, EmployeeOpsResponse } from "./client-types";
import type { B2bEmployeeDataRunBusyAction } from "./use-b2b-employee-data-busy-action";

type UseB2bEmployeeDataSelectionLifecycleParams = {
  runBusyAction: B2bEmployeeDataRunBusyAction;
  onHydrateFromOps: (data: EmployeeOpsResponse) => void;
};

export function useB2bEmployeeDataSelectionLifecycle({
  runBusyAction,
  onHydrateFromOps,
}: UseB2bEmployeeDataSelectionLifecycleParams) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [opsData, setOpsData] = useState<EmployeeOpsResponse | null>(null);

  const loadEmployeeList = useCallback(async (query = "") => {
    const data = await fetchEmployees(query);
    setEmployees(data.employees);
  }, []);

  const loadEmployeeOps = useCallback(
    async (employeeId: string) => {
      const detail = await fetchEmployeeOps(employeeId);
      setOpsData(detail);
      onHydrateFromOps(detail);
    },
    [onHydrateFromOps]
  );

  const refreshCurrentEmployee = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await loadEmployeeOps(selectedEmployeeId);
  }, [loadEmployeeOps, selectedEmployeeId]);

  useEffect(() => {
    void (async () => {
      await runBusyAction({
        message: "직원 목록을 불러오고 있습니다.",
        fallbackError: "직원 목록 조회에 실패했습니다.",
        run: async () => {
          await loadEmployeeList();
        },
      });
    })();
  }, [loadEmployeeList, runBusyAction]);

  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployeeId(null);
      setOpsData(null);
      return;
    }
    if (!selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
      return;
    }
    if (!employees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    void (async () => {
      await runBusyAction({
        message: "직원 운영 데이터를 불러오고 있습니다.",
        fallbackError: "직원 운영 데이터 조회에 실패했습니다.",
        run: async () => {
          await loadEmployeeOps(selectedEmployeeId);
        },
      });
    })();
  }, [loadEmployeeOps, runBusyAction, selectedEmployeeId]);

  return {
    employees,
    selectedEmployeeId,
    opsData,
    setSelectedEmployeeId,
    setOpsData,
    loadEmployeeList,
    refreshCurrentEmployee,
  };
}
