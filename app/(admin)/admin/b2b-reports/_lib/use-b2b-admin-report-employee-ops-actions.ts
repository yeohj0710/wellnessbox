import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { seedDemoEmployees } from "./api";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";

type UseB2bAdminReportEmployeeOpsActionsParams = {
  runBusyAction: B2bAdminReportRunBusyAction;
  loadEmployees: (query?: string) => Promise<void>;
  loadEmployeeDetail: (employeeId: string, periodKey?: string) => Promise<void>;
  setIsDetailLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedPeriodKey: Dispatch<SetStateAction<string>>;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  selectedEmployeeId: string | null;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function useB2bAdminReportEmployeeOpsActions({
  runBusyAction,
  loadEmployees,
  loadEmployeeDetail,
  setIsDetailLoading,
  setSelectedPeriodKey,
  setSelectedEmployeeId,
  selectedEmployeeId,
  setNotice,
}: UseB2bAdminReportEmployeeOpsActionsParams) {
  const handleSearch = useCallback(
    async (query: string) => {
      await runBusyAction({
        fallbackError: "검색에 실패했습니다.",
        run: async () => {
          await loadEmployees(query);
        },
      });
    },
    [loadEmployees, runBusyAction]
  );

  const handleSeedDemo = useCallback(async () => {
    await runBusyAction({
      fallbackError: "데모 데이터 생성에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        const seeded = await seedDemoEmployees();
        await loadEmployees("데모");
        if (seeded.employeeIds[0]) setSelectedEmployeeId(seeded.employeeIds[0]);
        setNotice("데모 데이터를 생성했습니다.");
      },
    });
  }, [loadEmployees, runBusyAction, setNotice, setSelectedEmployeeId]);

  const handleChangePeriod = useCallback(
    async (nextPeriod: string) => {
      if (!selectedEmployeeId) return;
      setSelectedPeriodKey(nextPeriod);
      setIsDetailLoading(true);
      try {
        await runBusyAction({
          fallbackError: "기간별 데이터 조회에 실패했습니다.",
          run: async () => {
            await loadEmployeeDetail(selectedEmployeeId, nextPeriod);
          },
        });
      } finally {
        setIsDetailLoading(false);
      }
    },
    [
      loadEmployeeDetail,
      runBusyAction,
      selectedEmployeeId,
      setIsDetailLoading,
      setSelectedPeriodKey,
    ]
  );

  return {
    handleSearch,
    handleSeedDemo,
    handleChangePeriod,
  };
}
