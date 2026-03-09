"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/common/toastContext.client";
import styles from "@/components/b2b/B2bUx.module.css";
import B2bAdminReportBootstrappingSkeleton from "./_components/B2bAdminReportBootstrappingSkeleton";
import B2bAdminOpsHero from "./_components/B2bAdminOpsHero";
import B2bAdminReportWorkspace from "./_components/B2bAdminReportWorkspace";
import B2bEmployeeSidebar from "./_components/B2bEmployeeSidebar";
import type {
  AdminClientProps,
  EmployeeListItem,
} from "./_lib/client-types";
import { fetchEmployees } from "./_lib/api";
import { useB2bAdminReportBusyAction } from "./_lib/use-b2b-admin-report-busy-action";
import { useB2bAdminReportActions } from "./_lib/use-b2b-admin-report-actions";
import { useB2bAdminBackgroundRefresh } from "./_lib/use-b2b-admin-background-refresh";
import { useB2bAdminReportDerivedState } from "./_lib/use-b2b-admin-report-derived-state";
import { useB2bAdminReportDetailState } from "./_lib/use-b2b-admin-report-detail-state";
import { useB2bAdminReportSelectionLifecycle } from "./_lib/use-b2b-admin-report-selection-lifecycle";
import { useB2bAdminReportToastEffects } from "./_lib/use-b2b-admin-report-toast-effects";
import { useB2bAdminReportWorkspaceModel } from "./_lib/use-b2b-admin-report-workspace-model";

export default function B2bAdminReportClient({ demoMode = false }: AdminClientProps) {
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const webReportCaptureRef = useRef<HTMLDivElement | null>(null);
  const { busy, runBusyAction } = useB2bAdminReportBusyAction({
    setError,
    setNotice,
  });
  const {
    surveyTemplate,
    surveyAnswers,
    setSurveyAnswers,
    selectedSections,
    setSelectedSections,
    surveySubmittedAt,
    surveyUpdatedAt,
    analysisText,
    setAnalysisText,
    note,
    setNote,
    recommendations,
    setRecommendations,
    cautions,
    setCautions,
    surveyDirty,
    setSurveyDirty,
    analysisDirty,
    setAnalysisDirty,
    noteDirty,
    setNoteDirty,
    latestReport,
    validationAudit,
    setValidationAudit,
    validationIssues,
    setValidationIssues,
    setValidatedLayout,
    latestLayout,
    showExportPreview,
    setShowExportPreview,
    selectedPeriodKey,
    setSelectedPeriodKey,
    periodOptions,
    reportDisplayPeriodKey,
    setReportDisplayPeriodKey,
    previewTab,
    setPreviewTab,
    loadEmployeeDetail,
    clearEmployeeDetailState,
  } = useB2bAdminReportDetailState();
  const {
    maxSelectedSections,
    wellnessTemplate,
    resolvedSelectedSections,
    selectedSectionSet,
    selectedEmployee,
    completionStats,
    hasUnsavedDraft,
  } = useB2bAdminReportDerivedState({
    employees,
    selectedEmployeeId,
    surveyTemplate,
    surveyAnswers,
    selectedSections,
    surveyDirty,
    analysisDirty,
    noteDirty,
  });

  const loadEmployees = useCallback(async (query = "") => {
    const data = await fetchEmployees(query);
    setEmployees(data.employees);
  }, []);

  const {
    isDetailLoading,
    isEmployeeListReady,
    isInitialDetailReady,
    selectEmployeeForLoading,
    setIsDetailLoading,
  } = useB2bAdminReportSelectionLifecycle({
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
  });
  const isBootstrapping = !isEmployeeListReady || (employees.length > 0 && !isInitialDetailReady);

  useB2bAdminReportToastEffects({
    notice,
    error,
    setNotice,
    setError,
    showToast,
  });

  useB2bAdminBackgroundRefresh({
    busy,
    hasUnsavedDraft,
    isDetailLoading,
    loadEmployeeDetail,
    loadEmployees,
    searchQuery: search,
    selectedEmployeeId,
    selectedPeriodKey,
  });

  const {
    handleSearch,
    handleSaveSurvey,
    handleSaveAnalysisPayload,
    handleSaveNote,
    handleRecomputeAnalysis,
    handleRegenerateReport,
    handleRunValidation,
    handleSaveDisplayPeriod,
    handleExportPdf,
    handleExportLegacyPdf,
    handleSeedDemo,
    handleChangePeriod,
    setAnswerValue,
    toggleSection,
    handleNoteChange,
    handleRecommendationsChange,
    handleCautionsChange,
    handleAnalysisTextChange,
  } = useB2bAdminReportActions({
    runBusyAction,
    loadEmployees,
    loadEmployeeDetail,
    setIsDetailLoading,
    setSelectedPeriodKey,
    setSelectedEmployeeId,
    selectedEmployeeId,
    selectedEmployee,
    selectedPeriodKey,
    latestReport,
    reportDisplayPeriodKey,
    setNotice,
    setError,
    setValidationAudit,
    setValidationIssues,
    setValidatedLayout,
    setShowExportPreview,
    webReportCaptureRef,
    wellnessTemplate,
    selectedSections,
    maxSelectedSections,
    surveyAnswers,
    resolvedSelectedSections,
    setSurveyAnswers,
    setSelectedSections,
    setSurveyDirty,
    setAnalysisDirty,
    setNoteDirty,
    setNote,
    setRecommendations,
    setCautions,
    setAnalysisText,
    note,
    recommendations,
    cautions,
    analysisText,
  });
  const workspace = useB2bAdminReportWorkspaceModel({
    selectedEmployeeId,
    isDetailLoading,
    selectedEmployee,
    latestReport,
    selectedPeriodKey,
    periodOptions,
    reportDisplayPeriodKey,
    busy,
    previewTab,
    latestLayout,
    captureRef: webReportCaptureRef,
    completionStats,
    surveySubmittedAt,
    surveyUpdatedAt,
    surveyTemplate,
    selectedSections: resolvedSelectedSections,
    selectedSectionSet,
    surveyAnswers,
    maxSelectedSections,
    note,
    recommendations,
    cautions,
    analysisText,
    showExportPreview,
    validationAudit,
    validationIssues,
    handleChangePeriod,
    setReportDisplayPeriodKey,
    handleSaveDisplayPeriod,
    handleExportPdf,
    handleExportLegacyPdf,
    handleRegenerateReport,
    handleRecomputeAnalysis,
    setPreviewTab,
    toggleSection,
    setAnswerValue,
    handleSaveSurvey,
    handleNoteChange,
    handleRecommendationsChange,
    handleCautionsChange,
    handleSaveNote,
    handleAnalysisTextChange,
    handleSaveAnalysisPayload,
    handleRunValidation,
    toggleValidationPreview: () => setShowExportPreview((prev) => !prev),
  });

  if (isBootstrapping) {
    return (
      <div className={styles.pageBackdrop}>
        <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
          <B2bAdminReportBootstrappingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageBackdrop}>
      <div className={`${styles.page} ${styles.pageNoBg} ${styles.stack}`}>
        <B2bAdminOpsHero
          search={search}
          busy={busy}
          demoMode={demoMode}
          onSearchChange={setSearch}
          onSearchSubmit={() => void handleSearch(search.trim())}
          onSeedDemo={() => void handleSeedDemo()}
        />

        <div className={styles.splitLayout}>
          <B2bEmployeeSidebar
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            busy={busy}
            onSelectEmployee={(employeeId) => {
              if (employeeId === selectedEmployeeId) return;
              selectEmployeeForLoading(employeeId);
            }}
          />

          <B2bAdminReportWorkspace
            selection={workspace.selection}
            content={workspace.content}
            actions={workspace.actions}
          />
        </div>
      </div>
    </div>
  );
}
