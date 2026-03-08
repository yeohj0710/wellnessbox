import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  B2bAdminReportPreviewTab,
  EmployeeListItem,
} from "./client-types";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";

type UseB2bAdminReportSelectionLifecycleParams = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
  selectedPeriodKey: string;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  setSelectedPeriodKey: Dispatch<SetStateAction<string>>;
  setReportDisplayPeriodKey: Dispatch<SetStateAction<string>>;
  setPreviewTab: Dispatch<SetStateAction<B2bAdminReportPreviewTab>>;
  clearEmployeeDetailState: () => void;
  loadEmployees: (query?: string) => Promise<void>;
  loadEmployeeDetail: (employeeId: string, periodKey?: string) => Promise<void>;
  runBusyAction: B2bAdminReportRunBusyAction;
};

export function useB2bAdminReportSelectionLifecycle({
  employees,
  selectedEmployeeId,
  selectedPeriodKey,
  setSelectedEmployeeId,
  setSelectedPeriodKey,
  setReportDisplayPeriodKey,
  setPreviewTab,
  clearEmployeeDetailState,
  loadEmployees,
  loadEmployeeDetail,
  runBusyAction,
}: UseB2bAdminReportSelectionLifecycleParams) {
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEmployeeListReady, setIsEmployeeListReady] = useState(false);
  const [isInitialDetailReady, setIsInitialDetailReady] = useState(false);

  const selectEmployeeForLoading = useCallback(
    (nextEmployeeId: string | null) => {
      setSelectedEmployeeId(nextEmployeeId);
      setSelectedPeriodKey("");
      setReportDisplayPeriodKey("");
      setPreviewTab("integrated");
      clearEmployeeDetailState();
      setIsDetailLoading(Boolean(nextEmployeeId));
    },
    [
      clearEmployeeDetailState,
      setPreviewTab,
      setReportDisplayPeriodKey,
      setSelectedEmployeeId,
      setSelectedPeriodKey,
    ]
  );

  useEffect(() => {
    void (async () => {
      try {
        await loadEmployees();
      } finally {
        setIsEmployeeListReady(true);
      }
    })();
  }, [loadEmployees]);

  useEffect(() => {
    if (employees.length === 0) {
      if (selectedEmployeeId !== null) {
        selectEmployeeForLoading(null);
      }
      return;
    }

    if (
      selectedEmployeeId &&
      employees.some((employee) => employee.id === selectedEmployeeId)
    ) {
      return;
    }

    selectEmployeeForLoading(employees[0].id);
  }, [employees, selectedEmployeeId, selectEmployeeForLoading]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setIsDetailLoading(false);
      return;
    }
    void (async () => {
      setIsDetailLoading(true);
      try {
        await runBusyAction({
          fallbackError: "임직원 상세 정보를 불러오지 못했습니다.",
          run: async () => {
            await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
          },
        });
      } finally {
        setIsDetailLoading(false);
        setIsInitialDetailReady((prev) => prev || true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  return {
    isDetailLoading,
    isEmployeeListReady,
    isInitialDetailReady,
    selectEmployeeForLoading,
    setIsDetailLoading,
  };
}
