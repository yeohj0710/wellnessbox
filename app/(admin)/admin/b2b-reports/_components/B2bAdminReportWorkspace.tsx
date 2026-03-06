import type { MutableRefObject } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import B2bAdminReportDetailSkeleton from "./B2bAdminReportDetailSkeleton";
import B2bAdminReportPreviewPanel from "./B2bAdminReportPreviewPanel";
import B2bAnalysisJsonPanel from "./B2bAnalysisJsonPanel";
import B2bEmployeeOverviewCard from "./B2bEmployeeOverviewCard";
import B2bLayoutValidationPanel from "./B2bLayoutValidationPanel";
import B2bNoteEditorPanel from "./B2bNoteEditorPanel";
import B2bSurveyEditorPanel from "./B2bSurveyEditorPanel";
import type {
  CompletionStats,
  EmployeeListItem,
  LatestReport,
  ReportAudit,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "../_lib/client-types";

type B2bAdminReportWorkspaceTab = "integrated" | "report";

type B2bAdminReportWorkspaceProps = {
  selectedEmployeeId: string | null;
  isDetailLoading: boolean;
  selectedEmployee: EmployeeListItem | null;
  latestReport: LatestReport | null;
  selectedPeriodKey: string;
  periodOptions: string[];
  reportDisplayPeriodKey: string;
  busy: boolean;
  previewTab: B2bAdminReportWorkspaceTab;
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
  onPeriodChange: (nextPeriod: string) => void;
  onReportDisplayPeriodChange: (value: string) => void;
  onSaveReportDisplayPeriod: () => void;
  onExportPdf: () => void;
  onExportLegacyPdf: () => void;
  onRegenerateReport: () => void;
  onRecomputeAnalysis: (generateAiEvaluation: boolean) => void;
  onPreviewTabChange: (nextTab: B2bAdminReportWorkspaceTab) => void;
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

export default function B2bAdminReportWorkspace({
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
  captureRef,
  completionStats,
  surveySubmittedAt,
  surveyUpdatedAt,
  surveyTemplate,
  selectedSections,
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
  onPeriodChange,
  onReportDisplayPeriodChange,
  onSaveReportDisplayPeriod,
  onExportPdf,
  onExportLegacyPdf,
  onRegenerateReport,
  onRecomputeAnalysis,
  onPreviewTabChange,
  onToggleSection,
  onSetAnswerValue,
  onSaveSurvey,
  onNoteChange,
  onRecommendationsChange,
  onCautionsChange,
  onSaveNote,
  onAnalysisTextChange,
  onSaveAnalysis,
  onRunValidation,
  onToggleValidationPreview,
}: B2bAdminReportWorkspaceProps) {
  return (
    <div className={styles.stack}>
      {!selectedEmployeeId ? (
        <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
          <p className={styles.reportSelectionPlaceholderText}>
            임직원을 선택하면 레포트 미리보기와 편집 도구가 함께 열려요.
          </p>
        </section>
      ) : null}

      {selectedEmployeeId && isDetailLoading ? <B2bAdminReportDetailSkeleton /> : null}

      {selectedEmployeeId && !isDetailLoading && selectedEmployee ? (
        <>
          <B2bEmployeeOverviewCard
            detail={selectedEmployee}
            latestReport={latestReport}
            selectedPeriodKey={selectedPeriodKey}
            periodOptions={periodOptions}
            reportDisplayPeriodKey={reportDisplayPeriodKey}
            busy={busy}
            onPeriodChange={onPeriodChange}
            onReportDisplayPeriodChange={onReportDisplayPeriodChange}
            onSaveReportDisplayPeriod={onSaveReportDisplayPeriod}
            onExportPdf={onExportPdf}
            onExportLegacyPdf={onExportLegacyPdf}
            onRegenerateReport={onRegenerateReport}
            onRecomputeAnalysis={onRecomputeAnalysis}
          />

          <B2bAdminReportPreviewPanel
            previewTab={previewTab}
            latestLayout={latestLayout}
            latestPayload={latestReport?.payload}
            captureRef={captureRef}
            onPreviewTabChange={onPreviewTabChange}
          />

          <B2bSurveyEditorPanel
            completionStats={completionStats}
            surveySubmittedAt={surveySubmittedAt}
            surveyUpdatedAt={surveyUpdatedAt}
            surveyTemplate={surveyTemplate}
            selectedSections={selectedSections}
            selectedSectionSet={selectedSectionSet}
            surveyAnswers={surveyAnswers}
            maxSelectedSections={maxSelectedSections}
            busy={busy}
            onToggleSection={onToggleSection}
            onSetAnswerValue={onSetAnswerValue}
            onSaveSurvey={onSaveSurvey}
          />

          <B2bNoteEditorPanel
            note={note}
            recommendations={recommendations}
            cautions={cautions}
            busy={busy}
            onNoteChange={onNoteChange}
            onRecommendationsChange={onRecommendationsChange}
            onCautionsChange={onCautionsChange}
            onSave={onSaveNote}
          />

          <B2bAnalysisJsonPanel
            analysisText={analysisText}
            busy={busy}
            onAnalysisTextChange={onAnalysisTextChange}
            onSave={onSaveAnalysis}
          />

          <B2bLayoutValidationPanel
            busy={busy}
            latestReportId={latestReport?.id ?? null}
            showExportPreview={showExportPreview}
            latestLayout={latestLayout}
            validationAudit={validationAudit}
            validationIssues={validationIssues}
            onRunValidation={onRunValidation}
            onTogglePreview={onToggleValidationPreview}
          />
        </>
      ) : null}

      {selectedEmployeeId && !isDetailLoading && !selectedEmployee ? (
        <section className={`${styles.sectionCard} ${styles.reportSelectionPlaceholder}`}>
          <p className={styles.reportSelectionPlaceholderText}>
            아직 상세 데이터를 불러오지 못했습니다. 다시 시도해 주세요.
          </p>
        </section>
      ) : null}
    </div>
  );
}
