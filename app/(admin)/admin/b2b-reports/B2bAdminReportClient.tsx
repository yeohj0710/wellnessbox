"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/common/toastContext.client";
import styles from "@/components/b2b/B2bUx.module.css";
import {
  buildPublicSurveyQuestionList,
  computeSurveyProgress,
  resolveSelectedSectionsFromC27,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type {
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";
import B2bAdminReportBootstrappingSkeleton from "./_components/B2bAdminReportBootstrappingSkeleton";
import B2bAdminOpsHero from "./_components/B2bAdminOpsHero";
import B2bAdminReportWorkspace from "./_components/B2bAdminReportWorkspace";
import B2bEmployeeSidebar from "./_components/B2bEmployeeSidebar";
import type {
  AdminClientProps,
  EmployeeListItem,
  LatestReport,
  ReportAudit,
  SurveyTemplateSchema,
} from "./_lib/client-types";
import {
  fetchEmployeeDetailBundle,
  fetchEmployees,
} from "./_lib/api";
import {
  extractIssuesFromAudit,
  mergePeriods,
  parseLayoutDsl,
} from "./_lib/client-utils";
import { mergeSurveyAnswers } from "./_lib/survey-answer-merge";
import { useB2bAdminReportBusyAction } from "./_lib/use-b2b-admin-report-busy-action";
import { useB2bAdminReportActions } from "./_lib/use-b2b-admin-report-actions";
import { useB2bAdminBackgroundRefresh } from "./_lib/use-b2b-admin-background-refresh";
import { useB2bAdminReportSelectionLifecycle } from "./_lib/use-b2b-admin-report-selection-lifecycle";
import { useB2bAdminReportToastEffects } from "./_lib/use-b2b-admin-report-toast-effects";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function B2bAdminReportClient({ demoMode = false }: AdminClientProps) {
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplateSchema | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, unknown>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [surveySubmittedAt, setSurveySubmittedAt] = useState<string | null>(null);
  const [surveyUpdatedAt, setSurveyUpdatedAt] = useState<string | null>(null);

  const [analysisText, setAnalysisText] = useState("{}");
  const [note, setNote] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [cautions, setCautions] = useState("");
  const [surveyDirty, setSurveyDirty] = useState(false);
  const [analysisDirty, setAnalysisDirty] = useState(false);
  const [noteDirty, setNoteDirty] = useState(false);

  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [validationAudit, setValidationAudit] = useState<ReportAudit | null>(null);
  const [validationIssues, setValidationIssues] = useState<LayoutValidationIssue[]>([]);
  const [validatedLayout, setValidatedLayout] = useState<LayoutDocument | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);

  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [reportDisplayPeriodKey, setReportDisplayPeriodKey] = useState("");
  const [previewTab, setPreviewTab] = useState<"integrated" | "report">("integrated");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const webReportCaptureRef = useRef<HTMLDivElement | null>(null);
  const { busy, runBusyAction } = useB2bAdminReportBusyAction({
    setError,
    setNotice,
  });

  const maxSelectedSections = surveyTemplate?.rules?.maxSelectedSections ?? 5;
  const wellnessTemplate = useMemo(
    () => (surveyTemplate as WellnessSurveyTemplate | null),
    [surveyTemplate]
  );
  const surveyAnswersRecord = surveyAnswers as PublicSurveyAnswers;
  const resolvedSelectedSections = useMemo(() => {
    if (!wellnessTemplate) return selectedSections;
    return resolveSelectedSectionsFromC27(
      wellnessTemplate,
      surveyAnswersRecord,
      selectedSections
    );
  }, [selectedSections, surveyAnswersRecord, wellnessTemplate]);
  const selectedSectionSet = useMemo(
    () => new Set(resolvedSelectedSections),
    [resolvedSelectedSections]
  );
  const latestLayout = useMemo(
    () => validatedLayout ?? parseLayoutDsl(latestReport?.layoutDsl),
    [latestReport?.layoutDsl, validatedLayout]
  );
  const periodOptions = useMemo(() => {
    if (availablePeriods.length > 0) return availablePeriods;
    if (selectedPeriodKey) return [selectedPeriodKey];
    return [];
  }, [availablePeriods, selectedPeriodKey]);
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );
  const hasUnsavedDraft = surveyDirty || analysisDirty || noteDirty;

  const completionStats = useMemo(
    () => {
      if (!wellnessTemplate) {
        return { total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0, percent: 0 };
      }
      const questionList = buildPublicSurveyQuestionList(
        wellnessTemplate,
        surveyAnswersRecord,
        resolvedSelectedSections,
        { deriveSelectedSections: false }
      );
      return computeSurveyProgress(questionList, surveyAnswersRecord);
    },
    [resolvedSelectedSections, surveyAnswersRecord, wellnessTemplate]
  );

  const loadEmployees = useCallback(async (query = "") => {
    const data = await fetchEmployees(query);
    setEmployees(data.employees);
  }, []);

  const loadEmployeeDetail = useCallback(async (employeeId: string, periodKey?: string) => {
    const { survey, analysis, note: noteData, report } = await fetchEmployeeDetailBundle(
      employeeId,
      periodKey
    );

    setSurveyTemplate(survey.template.schema);
    setSelectedSections(survey.response?.selectedSections ?? []);
    setSurveySubmittedAt(survey.response?.submittedAt ?? null);
    setSurveyUpdatedAt(survey.response?.updatedAt ?? null);

    const answersFromJson = survey.response?.answersJson || {};
    setSurveyAnswers(
      mergeSurveyAnswers({
        answersFromJson,
        answerRows: survey.response?.answers,
      })
    );

    setAnalysisText(JSON.stringify(analysis.analysis?.payload ?? {}, null, 2));
    setNote(noteData.note?.note ?? "");
    setRecommendations(noteData.note?.recommendations ?? "");
    setCautions(noteData.note?.cautions ?? "");

    setLatestReport(report.latest);
    setValidatedLayout(parseLayoutDsl(report.latest?.layoutDsl));
    setValidationAudit((report.latest?.exportAudit ?? null) as ReportAudit | null);
    setValidationIssues(extractIssuesFromAudit(report.latest?.exportAudit));

    const mergedPeriods = mergePeriods(
      report.availablePeriods,
      survey.availablePeriods,
      analysis.availablePeriods,
      report.latest?.periodKey ? [String(report.latest.periodKey)] : [],
      periodKey ? [periodKey] : []
    );
    setAvailablePeriods(mergedPeriods);
    const nextSelectedPeriod =
      report.latest?.periodKey || report.periodKey || survey.periodKey || analysis.periodKey || "";
    setSelectedPeriodKey(nextSelectedPeriod);
    const displayPeriodRaw = report.latest?.payload?.meta?.periodKey ?? nextSelectedPeriod;
    setReportDisplayPeriodKey(
      typeof displayPeriodRaw === "string" && MONTH_KEY_PATTERN.test(displayPeriodRaw)
        ? displayPeriodRaw
        : ""
    );
    setSurveyDirty(false);
    setAnalysisDirty(false);
    setNoteDirty(false);
  }, []);

  const clearEmployeeDetailState = useCallback(() => {
    setLatestReport(null);
    setValidatedLayout(null);
    setValidationAudit(null);
    setValidationIssues([]);
    setSurveyDirty(false);
    setAnalysisDirty(false);
    setNoteDirty(false);
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
            selectedEmployeeId={selectedEmployeeId}
            isDetailLoading={isDetailLoading}
            selectedEmployee={selectedEmployee}
            latestReport={latestReport}
            selectedPeriodKey={selectedPeriodKey}
            periodOptions={periodOptions}
            reportDisplayPeriodKey={reportDisplayPeriodKey}
            busy={busy}
            previewTab={previewTab}
            latestLayout={latestLayout}
            captureRef={webReportCaptureRef}
            completionStats={completionStats}
            surveySubmittedAt={surveySubmittedAt}
            surveyUpdatedAt={surveyUpdatedAt}
            surveyTemplate={surveyTemplate}
            selectedSections={resolvedSelectedSections}
            selectedSectionSet={selectedSectionSet}
            surveyAnswers={surveyAnswers}
            maxSelectedSections={maxSelectedSections}
            note={note}
            recommendations={recommendations}
            cautions={cautions}
            analysisText={analysisText}
            showExportPreview={showExportPreview}
            validationAudit={validationAudit}
            validationIssues={validationIssues}
            onPeriodChange={(next) => {
              void handleChangePeriod(next);
            }}
            onReportDisplayPeriodChange={setReportDisplayPeriodKey}
            onSaveReportDisplayPeriod={() => void handleSaveDisplayPeriod()}
            onExportPdf={() => void handleExportPdf()}
            onExportLegacyPdf={() => void handleExportLegacyPdf()}
            onRegenerateReport={() => void handleRegenerateReport()}
            onRecomputeAnalysis={(generateAiEvaluation) => {
              void handleRecomputeAnalysis(generateAiEvaluation);
            }}
            onPreviewTabChange={setPreviewTab}
            onToggleSection={toggleSection}
            onSetAnswerValue={setAnswerValue}
            onSaveSurvey={() => void handleSaveSurvey()}
            onNoteChange={handleNoteChange}
            onRecommendationsChange={handleRecommendationsChange}
            onCautionsChange={handleCautionsChange}
            onSaveNote={() => void handleSaveNote()}
            onAnalysisTextChange={handleAnalysisTextChange}
            onSaveAnalysis={() => void handleSaveAnalysisPayload()}
            onRunValidation={() => void handleRunValidation()}
            onToggleValidationPreview={() => setShowExportPreview((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
}
