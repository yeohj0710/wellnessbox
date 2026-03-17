import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";
import type { LatestReport, ReportAudit } from "./client-types";
import { useB2bAdminReportEmployeeOpsActions } from "./use-b2b-admin-report-employee-ops-actions";
import { useB2bAdminReportPersistenceActions } from "./use-b2b-admin-report-persistence-actions";
import { useB2bAdminReportValidationActions } from "./use-b2b-admin-report-validation-actions";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";

type UseB2bAdminReportCrudActionsParams = {
  runBusyAction: B2bAdminReportRunBusyAction;
  loadEmployees: (query?: string) => Promise<void>;
  loadEmployeeDetail: (employeeId: string, periodKey?: string) => Promise<void>;
  setIsDetailLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedPeriodKey: Dispatch<SetStateAction<string>>;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  selectedEmployeeId: string | null;
  selectedPeriodKey: string;
  latestReport: LatestReport | null;
  reportDisplayPeriodKey: string;
  setNotice: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setValidationAudit: Dispatch<SetStateAction<ReportAudit | null>>;
  setValidationIssues: Dispatch<SetStateAction<LayoutValidationIssue[]>>;
  setValidatedLayout: Dispatch<SetStateAction<LayoutDocument | null>>;
  surveyAnswers: Record<string, unknown>;
  resolvedSelectedSections: string[];
  setSurveyDirty: Dispatch<SetStateAction<boolean>>;
  setAnalysisDirty: Dispatch<SetStateAction<boolean>>;
  reportConsultationSummary: string;
  reportPackagedProducts: B2bReportPackagedProduct[];
  analysisText: string;
  setReportCustomizationDirty: Dispatch<SetStateAction<boolean>>;
};

export function useB2bAdminReportCrudActions({
  runBusyAction,
  loadEmployees,
  loadEmployeeDetail,
  setIsDetailLoading,
  setSelectedPeriodKey,
  setSelectedEmployeeId,
  selectedEmployeeId,
  selectedPeriodKey,
  latestReport,
  reportDisplayPeriodKey,
  setNotice,
  setError,
  setValidationAudit,
  setValidationIssues,
  setValidatedLayout,
  surveyAnswers,
  resolvedSelectedSections,
  setSurveyDirty,
  setAnalysisDirty,
  reportConsultationSummary,
  reportPackagedProducts,
  analysisText,
  setReportCustomizationDirty,
}: UseB2bAdminReportCrudActionsParams) {
  const reloadCurrentEmployee = useCallback(async () => {
    if (!selectedEmployeeId) return;
    await loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined);
  }, [loadEmployeeDetail, selectedEmployeeId, selectedPeriodKey]);

  const employeeOpsActions = useB2bAdminReportEmployeeOpsActions({
    runBusyAction,
    loadEmployees,
    loadEmployeeDetail,
    setIsDetailLoading,
    setSelectedPeriodKey,
    setSelectedEmployeeId,
    selectedEmployeeId,
    setNotice,
  });

  const persistenceActions = useB2bAdminReportPersistenceActions({
    runBusyAction,
    selectedEmployeeId,
    selectedPeriodKey,
    latestReportId: latestReport?.id ?? null,
    surveyAnswers,
    resolvedSelectedSections,
    analysisText,
    reportConsultationSummary,
    reportPackagedProducts,
    setSurveyDirty,
    setAnalysisDirty,
    setReportCustomizationDirty,
    setNotice,
    reloadCurrentEmployee,
  });

  const validationActions = useB2bAdminReportValidationActions({
    runBusyAction,
    latestReport,
    reportDisplayPeriodKey,
    setError,
    setNotice,
    setValidationAudit,
    setValidationIssues,
    setValidatedLayout,
    reloadCurrentEmployee,
  });

  return {
    ...employeeOpsActions,
    ...persistenceActions,
    ...validationActions,
  };
}
