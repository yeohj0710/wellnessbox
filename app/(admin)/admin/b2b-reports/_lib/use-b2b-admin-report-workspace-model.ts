import { useMemo } from "react";
import type { MutableRefObject } from "react";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";
import type {
  CompletionStats,
  EmployeeListItem,
  LatestReport,
  ReportAudit,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "./client-types";
import type {
  B2bAdminReportWorkspaceActions,
  B2bAdminReportWorkspaceContentState,
  B2bAdminReportWorkspaceProps,
  B2bAdminReportWorkspaceSelectionState,
} from "../_components/B2bAdminReportWorkspace.types";

type UseB2bAdminReportWorkspaceModelParams = {
  selectedEmployeeId: string | null;
  isDetailLoading: boolean;
  selectedEmployee: EmployeeListItem | null;
  latestReport: LatestReport | null;
  selectedPeriodKey: string;
  periodOptions: string[];
  reportDisplayPeriodKey: string;
  busy: boolean;
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
  reportConsultationSummary: string;
  reportPackagedProducts: B2bReportPackagedProduct[];
  analysisText: string;
  showExportPreview: boolean;
  validationAudit: ReportAudit | null;
  validationIssues: LayoutValidationIssue[];
  handleChangePeriod: (nextPeriod: string) => Promise<void>;
  setReportDisplayPeriodKey: (value: string) => void;
  handleSaveDisplayPeriod: () => Promise<void>;
  handleExportPdf: () => Promise<void>;
  handleExportLegacyPdf: () => Promise<void>;
  handleRegenerateReport: () => Promise<void>;
  handleRecomputeAnalysis: (generateAiEvaluation: boolean) => Promise<void>;
  toggleSection: (sectionKey: string) => void;
  setAnswerValue: (question: SurveyQuestion, value: unknown) => void;
  handleSaveSurvey: () => Promise<void>;
  handleReportConsultationSummaryChange: (value: string) => void;
  handleReportPackagedProductsChange: (products: B2bReportPackagedProduct[]) => void;
  handleSaveReportCustomization: () => Promise<void>;
  handleAnalysisTextChange: (value: string) => void;
  handleSaveAnalysisPayload: () => Promise<void>;
  handleRunValidation: () => Promise<void>;
  toggleValidationPreview: () => void;
};

export function useB2bAdminReportWorkspaceModel({
  selectedEmployeeId,
  isDetailLoading,
  selectedEmployee,
  latestReport,
  selectedPeriodKey,
  periodOptions,
  reportDisplayPeriodKey,
  busy,
  latestLayout,
  captureRef,
  completionStats,
  surveySubmittedAt,
  surveyUpdatedAt,
  surveyTemplate,
  selectedSections,
  selectedSectionSet,
  surveyAnswers,
  maxSelectedSections,
  reportConsultationSummary,
  reportPackagedProducts,
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
  toggleSection,
  setAnswerValue,
  handleSaveSurvey,
  handleReportConsultationSummaryChange,
  handleReportPackagedProductsChange,
  handleSaveReportCustomization,
  handleAnalysisTextChange,
  handleSaveAnalysisPayload,
  handleRunValidation,
  toggleValidationPreview,
}: UseB2bAdminReportWorkspaceModelParams): B2bAdminReportWorkspaceProps {
  const selection = useMemo<B2bAdminReportWorkspaceSelectionState>(
    () => ({
      selectedEmployeeId,
      isDetailLoading,
      selectedEmployee,
    }),
    [isDetailLoading, selectedEmployee, selectedEmployeeId]
  );

  const content = useMemo<B2bAdminReportWorkspaceContentState>(
    () => ({
      latestReport,
      selectedPeriodKey,
      periodOptions,
      reportDisplayPeriodKey,
      busy,
      latestLayout,
      captureRef,
      completionStats,
      surveySubmittedAt,
      surveyUpdatedAt,
      surveyTemplate,
      selectedSections,
      selectedSectionSet,
      surveyAnswers,
      maxSelectedSections,
      reportConsultationSummary,
      reportPackagedProducts,
      analysisText,
      showExportPreview,
      validationAudit,
      validationIssues,
    }),
    [
      analysisText,
      busy,
      captureRef,
      completionStats,
      latestLayout,
      latestReport,
      maxSelectedSections,
      periodOptions,
      reportConsultationSummary,
      reportDisplayPeriodKey,
      reportPackagedProducts,
      selectedPeriodKey,
      selectedSections,
      selectedSectionSet,
      showExportPreview,
      surveyAnswers,
      surveySubmittedAt,
      surveyTemplate,
      surveyUpdatedAt,
      validationAudit,
      validationIssues,
    ]
  );

  const actions = useMemo<B2bAdminReportWorkspaceActions>(
    () => ({
      onPeriodChange: (nextPeriod) => {
        void handleChangePeriod(nextPeriod);
      },
      onReportDisplayPeriodChange: setReportDisplayPeriodKey,
      onSaveReportDisplayPeriod: () => {
        void handleSaveDisplayPeriod();
      },
      onExportPdf: () => {
        void handleExportPdf();
      },
      onExportLegacyPdf: () => {
        void handleExportLegacyPdf();
      },
      onRegenerateReport: () => {
        void handleRegenerateReport();
      },
      onRecomputeAnalysis: (generateAiEvaluation) => {
        void handleRecomputeAnalysis(generateAiEvaluation);
      },
      onToggleSection: toggleSection,
      onSetAnswerValue: setAnswerValue,
      onSaveSurvey: () => {
        void handleSaveSurvey();
      },
      onReportConsultationSummaryChange: handleReportConsultationSummaryChange,
      onReportPackagedProductsChange: handleReportPackagedProductsChange,
      onSaveReportCustomization: () => {
        void handleSaveReportCustomization();
      },
      onAnalysisTextChange: handleAnalysisTextChange,
      onSaveAnalysis: () => {
        void handleSaveAnalysisPayload();
      },
      onRunValidation: () => {
        void handleRunValidation();
      },
      onToggleValidationPreview: toggleValidationPreview,
    }),
    [
      handleAnalysisTextChange,
      handleChangePeriod,
      handleExportLegacyPdf,
      handleExportPdf,
      handleReportConsultationSummaryChange,
      handleReportPackagedProductsChange,
      handleRecomputeAnalysis,
      handleRegenerateReport,
      handleRunValidation,
      handleSaveAnalysisPayload,
      handleSaveDisplayPeriod,
      handleSaveReportCustomization,
      handleSaveSurvey,
      setAnswerValue,
      setReportDisplayPeriodKey,
      toggleSection,
      toggleValidationPreview,
    ]
  );

  return {
    selection,
    content,
    actions,
  };
}
