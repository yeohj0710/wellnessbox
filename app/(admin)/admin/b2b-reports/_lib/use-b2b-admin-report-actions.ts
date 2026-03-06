import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import type { EmployeeListItem, LatestReport, ReportAudit } from "./client-types";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";
import { useB2bAdminReportCrudActions } from "./use-b2b-admin-report-crud-actions";
import { useB2bAdminReportEditorStateActions } from "./use-b2b-admin-report-editor-state-actions";
import { useB2bAdminReportExportActions } from "./use-b2b-admin-report-export-actions";
import { useB2bAdminReportSurveyInputActions } from "./use-b2b-admin-report-survey-input-actions";

type UseB2bAdminReportActionsParams = {
  runBusyAction: B2bAdminReportRunBusyAction;
  loadEmployees: (query?: string) => Promise<void>;
  loadEmployeeDetail: (employeeId: string, periodKey?: string) => Promise<void>;
  setIsDetailLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedPeriodKey: Dispatch<SetStateAction<string>>;
  setSelectedEmployeeId: Dispatch<SetStateAction<string | null>>;
  selectedEmployeeId: string | null;
  selectedEmployee: EmployeeListItem | null;
  selectedPeriodKey: string;
  latestReport: LatestReport | null;
  reportDisplayPeriodKey: string;
  setNotice: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setValidationAudit: Dispatch<SetStateAction<ReportAudit | null>>;
  setValidationIssues: Dispatch<SetStateAction<LayoutValidationIssue[]>>;
  setValidatedLayout: Dispatch<SetStateAction<LayoutDocument | null>>;
  setShowExportPreview: Dispatch<SetStateAction<boolean>>;
  webReportCaptureRef: MutableRefObject<HTMLDivElement | null>;
  wellnessTemplate: WellnessSurveyTemplate | null;
  selectedSections: string[];
  maxSelectedSections: number;
  surveyAnswers: Record<string, unknown>;
  resolvedSelectedSections: string[];
  setSurveyAnswers: Dispatch<SetStateAction<Record<string, unknown>>>;
  setSelectedSections: Dispatch<SetStateAction<string[]>>;
  setSurveyDirty: Dispatch<SetStateAction<boolean>>;
  setAnalysisDirty: Dispatch<SetStateAction<boolean>>;
  setNoteDirty: Dispatch<SetStateAction<boolean>>;
  setNote: Dispatch<SetStateAction<string>>;
  setRecommendations: Dispatch<SetStateAction<string>>;
  setCautions: Dispatch<SetStateAction<string>>;
  setAnalysisText: Dispatch<SetStateAction<string>>;
  note: string;
  recommendations: string;
  cautions: string;
  analysisText: string;
};

export function useB2bAdminReportActions(params: UseB2bAdminReportActionsParams) {
  const surveyInputActions = useB2bAdminReportSurveyInputActions({
    wellnessTemplate: params.wellnessTemplate,
    selectedSections: params.selectedSections,
    maxSelectedSections: params.maxSelectedSections,
    setSurveyAnswers: params.setSurveyAnswers,
    setSelectedSections: params.setSelectedSections,
    setSurveyDirty: params.setSurveyDirty,
  });

  const editorStateActions = useB2bAdminReportEditorStateActions({
    setNoteDirty: params.setNoteDirty,
    setNote: params.setNote,
    setRecommendations: params.setRecommendations,
    setCautions: params.setCautions,
    setAnalysisDirty: params.setAnalysisDirty,
    setAnalysisText: params.setAnalysisText,
  });

  const crudActions = useB2bAdminReportCrudActions({
    runBusyAction: params.runBusyAction,
    loadEmployees: params.loadEmployees,
    loadEmployeeDetail: params.loadEmployeeDetail,
    setIsDetailLoading: params.setIsDetailLoading,
    setSelectedPeriodKey: params.setSelectedPeriodKey,
    setSelectedEmployeeId: params.setSelectedEmployeeId,
    selectedEmployeeId: params.selectedEmployeeId,
    selectedPeriodKey: params.selectedPeriodKey,
    latestReport: params.latestReport,
    reportDisplayPeriodKey: params.reportDisplayPeriodKey,
    setNotice: params.setNotice,
    setError: params.setError,
    setValidationAudit: params.setValidationAudit,
    setValidationIssues: params.setValidationIssues,
    setValidatedLayout: params.setValidatedLayout,
    surveyAnswers: params.surveyAnswers,
    resolvedSelectedSections: params.resolvedSelectedSections,
    setSurveyDirty: params.setSurveyDirty,
    setAnalysisDirty: params.setAnalysisDirty,
    setNoteDirty: params.setNoteDirty,
    note: params.note,
    recommendations: params.recommendations,
    cautions: params.cautions,
    analysisText: params.analysisText,
  });

  const exportActions = useB2bAdminReportExportActions({
    runBusyAction: params.runBusyAction,
    latestReport: params.latestReport,
    selectedEmployee: params.selectedEmployee,
    selectedPeriodKey: params.selectedPeriodKey,
    setNotice: params.setNotice,
    setError: params.setError,
    setValidationAudit: params.setValidationAudit,
    setValidationIssues: params.setValidationIssues,
    setShowExportPreview: params.setShowExportPreview,
    webReportCaptureRef: params.webReportCaptureRef,
  });

  return {
    ...crudActions,
    ...exportActions,
    ...surveyInputActions,
    ...editorStateActions,
  };
}
