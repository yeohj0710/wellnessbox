import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type {
  LatestReport,
  ReportAudit,
  SurveyTemplateSchema,
} from "./client-types";
import type { EmployeeDetailBundle } from "./api";
import { extractIssuesFromAudit, mergePeriods, parseLayoutDsl } from "./client-utils";
import { mergeSurveyAnswers } from "./survey-answer-merge";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type LoadedEmployeeDetailState = {
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

export function buildEmptyEmployeeDetailState(): LoadedEmployeeDetailState {
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

export function buildLoadedEmployeeDetailState(
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
