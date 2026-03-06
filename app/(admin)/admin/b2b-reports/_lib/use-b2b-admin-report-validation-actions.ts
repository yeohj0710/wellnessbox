import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import { runLayoutValidation, saveReportDisplayPeriod } from "./api";
import type { LatestReport, ReportAudit } from "./client-types";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type UseB2bAdminReportValidationActionsParams = {
  runBusyAction: B2bAdminReportRunBusyAction;
  latestReport: LatestReport | null;
  reportDisplayPeriodKey: string;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setValidationAudit: Dispatch<SetStateAction<ReportAudit | null>>;
  setValidationIssues: Dispatch<SetStateAction<LayoutValidationIssue[]>>;
  setValidatedLayout: Dispatch<SetStateAction<LayoutDocument | null>>;
  reloadCurrentEmployee: () => Promise<void>;
};

export function useB2bAdminReportValidationActions({
  runBusyAction,
  latestReport,
  reportDisplayPeriodKey,
  setError,
  setNotice,
  setValidationAudit,
  setValidationIssues,
  setValidatedLayout,
  reloadCurrentEmployee,
}: UseB2bAdminReportValidationActionsParams) {
  const handleRunValidation = useCallback(async () => {
    if (!latestReport?.id) return;
    await runBusyAction({
      fallbackError: "레이아웃 검증에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        const result = await runLayoutValidation(latestReport.id);
        setValidationAudit((result.audit ?? null) as ReportAudit | null);
        setValidationIssues(result.issues ?? []);
        if (result.layout) setValidatedLayout(result.layout);
        setNotice(result.ok ? "레이아웃 검증을 완료했습니다." : "레이아웃 검증에 실패했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }, [
    latestReport?.id,
    reloadCurrentEmployee,
    runBusyAction,
    setNotice,
    setValidatedLayout,
    setValidationAudit,
    setValidationIssues,
  ]);

  const handleSaveDisplayPeriod = useCallback(async () => {
    if (!latestReport?.id) return;
    const nextDisplayPeriod = reportDisplayPeriodKey.trim();
    if (!MONTH_KEY_PATTERN.test(nextDisplayPeriod)) {
      setError("표시 연월은 YYYY-MM 형식으로 입력해 주세요.");
      return;
    }
    await runBusyAction({
      fallbackError: "표시 연월 저장에 실패했습니다.",
      clearNotice: true,
      run: async () => {
        await saveReportDisplayPeriod({
          reportId: latestReport.id,
          displayPeriodKey: nextDisplayPeriod,
        });
        setNotice("리포트 표시 연월을 반영했습니다.");
        await reloadCurrentEmployee();
      },
    });
  }, [
    latestReport?.id,
    reloadCurrentEmployee,
    reportDisplayPeriodKey,
    runBusyAction,
    setError,
    setNotice,
  ]);

  return {
    handleRunValidation,
    handleSaveDisplayPeriod,
  };
}
