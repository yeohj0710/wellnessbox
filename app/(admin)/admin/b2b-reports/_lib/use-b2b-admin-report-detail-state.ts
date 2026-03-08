"use client";

import { useCallback, useMemo, useState } from "react";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import { fetchEmployeeDetailBundle, type EmployeeDetailBundle } from "./api";
import type {
  B2bAdminReportPreviewTab,
  LatestReport,
  ReportAudit,
  SurveyTemplateSchema,
} from "./client-types";
import { extractIssuesFromAudit, mergePeriods, parseLayoutDsl } from "./client-utils";
import { mergeSurveyAnswers } from "./survey-answer-merge";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type LoadedEmployeeDetailState = {
  surveyTemplate: SurveyTemplateSchema | null;
  surveyAnswers: Record<string, unknown>;
  selectedSections: string[];
  surveySubmittedAt: string | null;
  surveyUpdatedAt: string | null;
  analysisText: string;
  note: string;
  recommendations: string;
  cautions: string;
  latestReport: LatestReport | null;
  validationAudit: ReportAudit | null;
  validationIssues: LayoutValidationIssue[];
  validatedLayout: LayoutDocument | null;
  availablePeriods: string[];
  selectedPeriodKey: string;
  reportDisplayPeriodKey: string;
};

function buildEmptyEmployeeDetailState(): LoadedEmployeeDetailState {
  return {
    surveyTemplate: null,
    surveyAnswers: {},
    selectedSections: [],
    surveySubmittedAt: null,
    surveyUpdatedAt: null,
    analysisText: "{}",
    note: "",
    recommendations: "",
    cautions: "",
    latestReport: null,
    validationAudit: null,
    validationIssues: [],
    validatedLayout: null,
    availablePeriods: [],
    selectedPeriodKey: "",
    reportDisplayPeriodKey: "",
  };
}

function buildLoadedEmployeeDetailState(
  bundle: EmployeeDetailBundle,
  requestedPeriodKey?: string
): LoadedEmployeeDetailState {
  const { survey, analysis, note: noteData, report } = bundle;
  const nextSelectedPeriod =
    report.latest?.periodKey || report.periodKey || survey.periodKey || analysis.periodKey || "";
  const displayPeriodRaw = report.latest?.payload?.meta?.periodKey ?? nextSelectedPeriod;

  return {
    surveyTemplate: survey.template.schema,
    surveyAnswers: mergeSurveyAnswers({
      answersFromJson: survey.response?.answersJson || {},
      answerRows: survey.response?.answers,
    }),
    selectedSections: survey.response?.selectedSections ?? [],
    surveySubmittedAt: survey.response?.submittedAt ?? null,
    surveyUpdatedAt: survey.response?.updatedAt ?? null,
    analysisText: JSON.stringify(analysis.analysis?.payload ?? {}, null, 2),
    note: noteData.note?.note ?? "",
    recommendations: noteData.note?.recommendations ?? "",
    cautions: noteData.note?.cautions ?? "",
    latestReport: report.latest,
    validationAudit: (report.latest?.exportAudit ?? null) as ReportAudit | null,
    validationIssues: extractIssuesFromAudit(report.latest?.exportAudit),
    validatedLayout: parseLayoutDsl(report.latest?.layoutDsl),
    availablePeriods: mergePeriods(
      report.availablePeriods,
      survey.availablePeriods,
      analysis.availablePeriods,
      report.latest?.periodKey ? [String(report.latest.periodKey)] : [],
      requestedPeriodKey ? [requestedPeriodKey] : []
    ),
    selectedPeriodKey: nextSelectedPeriod,
    reportDisplayPeriodKey:
      typeof displayPeriodRaw === "string" && MONTH_KEY_PATTERN.test(displayPeriodRaw)
        ? displayPeriodRaw
        : "",
  };
}

export function useB2bAdminReportDetailState() {
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
  const [previewTab, setPreviewTab] = useState<B2bAdminReportPreviewTab>("integrated");

  const applyDetailState = useCallback((nextState: LoadedEmployeeDetailState) => {
    setSurveyTemplate(nextState.surveyTemplate);
    setSurveyAnswers(nextState.surveyAnswers);
    setSelectedSections(nextState.selectedSections);
    setSurveySubmittedAt(nextState.surveySubmittedAt);
    setSurveyUpdatedAt(nextState.surveyUpdatedAt);
    setAnalysisText(nextState.analysisText);
    setNote(nextState.note);
    setRecommendations(nextState.recommendations);
    setCautions(nextState.cautions);
    setLatestReport(nextState.latestReport);
    setValidationAudit(nextState.validationAudit);
    setValidationIssues(nextState.validationIssues);
    setValidatedLayout(nextState.validatedLayout);
    setAvailablePeriods(nextState.availablePeriods);
    setSelectedPeriodKey(nextState.selectedPeriodKey);
    setReportDisplayPeriodKey(nextState.reportDisplayPeriodKey);
    setSurveyDirty(false);
    setAnalysisDirty(false);
    setNoteDirty(false);
  }, []);

  const loadEmployeeDetail = useCallback(
    async (employeeId: string, periodKey?: string) => {
      const bundle = await fetchEmployeeDetailBundle(employeeId, periodKey);
      applyDetailState(buildLoadedEmployeeDetailState(bundle, periodKey));
    },
    [applyDetailState]
  );

  const clearEmployeeDetailState = useCallback(() => {
    applyDetailState(buildEmptyEmployeeDetailState());
    setShowExportPreview(false);
    setPreviewTab("integrated");
  }, [applyDetailState]);

  const latestLayout = useMemo(
    () => validatedLayout ?? parseLayoutDsl(latestReport?.layoutDsl),
    [latestReport?.layoutDsl, validatedLayout]
  );

  const periodOptions = useMemo(() => {
    if (availablePeriods.length > 0) return availablePeriods;
    if (selectedPeriodKey) return [selectedPeriodKey];
    return [];
  }, [availablePeriods, selectedPeriodKey]);

  return {
    surveyTemplate,
    setSurveyTemplate,
    surveyAnswers,
    setSurveyAnswers,
    selectedSections,
    setSelectedSections,
    surveySubmittedAt,
    setSurveySubmittedAt,
    surveyUpdatedAt,
    setSurveyUpdatedAt,
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
    setLatestReport,
    validationAudit,
    setValidationAudit,
    validationIssues,
    setValidationIssues,
    validatedLayout,
    setValidatedLayout,
    latestLayout,
    showExportPreview,
    setShowExportPreview,
    selectedPeriodKey,
    setSelectedPeriodKey,
    availablePeriods,
    setAvailablePeriods,
    periodOptions,
    reportDisplayPeriodKey,
    setReportDisplayPeriodKey,
    previewTab,
    setPreviewTab,
    loadEmployeeDetail,
    clearEmployeeDetailState,
  };
}
