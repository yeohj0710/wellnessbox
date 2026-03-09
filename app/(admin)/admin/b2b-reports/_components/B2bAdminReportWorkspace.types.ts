import type { MutableRefObject } from "react";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type {
  B2bAdminReportPreviewTab,
  CompletionStats,
  EmployeeListItem,
  LatestReport,
  ReportAudit,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";

export type B2bAdminReportWorkspaceSelectionState = {
  selectedEmployeeId: string | null;
  isDetailLoading: boolean;
  selectedEmployee: EmployeeListItem | null;
};

export type B2bAdminReportWorkspaceContentState = {
  latestReport: LatestReport | null;
  selectedPeriodKey: string;
  periodOptions: string[];
  reportDisplayPeriodKey: string;
  busy: boolean;
  previewTab: B2bAdminReportPreviewTab;
  latestLayout: LayoutDocument | null;
  captureRef: MutableRefObject<HTMLDivElement | null>;
  completionStats: CompletionStats;
  surveySubmittedAt: string | null;
  surveyUpdatedAt: string | null;
  surveyTemplate: SurveyTemplateSchema | null;
  selectedSections: string[];
  selectedSectionSet: Set<string>;
  surveyAnswers: Record<string, unknown>;
  maxSelectedSections: number;
  note: string;
  recommendations: string;
  cautions: string;
  analysisText: string;
  showExportPreview: boolean;
  validationAudit: ReportAudit | null;
  validationIssues: LayoutValidationIssue[];
};

export type B2bAdminReportWorkspaceActions = {
  onPeriodChange: (nextPeriod: string) => void;
  onReportDisplayPeriodChange: (value: string) => void;
  onSaveReportDisplayPeriod: () => void;
  onExportPdf: () => void;
  onExportLegacyPdf: () => void;
  onRegenerateReport: () => void;
  onRecomputeAnalysis: (generateAiEvaluation: boolean) => void;
  onPreviewTabChange: (nextTab: B2bAdminReportPreviewTab) => void;
  onToggleSection: (sectionKey: string) => void;
  onSetAnswerValue: (question: SurveyQuestion, value: unknown) => void;
  onSaveSurvey: () => void;
  onNoteChange: (value: string) => void;
  onRecommendationsChange: (value: string) => void;
  onCautionsChange: (value: string) => void;
  onSaveNote: () => void;
  onAnalysisTextChange: (value: string) => void;
  onSaveAnalysis: () => void;
  onRunValidation: () => void;
  onToggleValidationPreview: () => void;
};

export type B2bAdminReportWorkspaceLoadedProps = {
  selectedEmployee: EmployeeListItem;
  content: B2bAdminReportWorkspaceContentState;
  actions: B2bAdminReportWorkspaceActions;
};

export type B2bAdminReportWorkspaceProps = {
  selection: B2bAdminReportWorkspaceSelectionState;
  content: B2bAdminReportWorkspaceContentState;
  actions: B2bAdminReportWorkspaceActions;
};
