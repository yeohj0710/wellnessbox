import B2bAdminReportPreviewPanel from "./B2bAdminReportPreviewPanel";
import B2bAnalysisJsonPanel from "./B2bAnalysisJsonPanel";
import B2bEmployeeOverviewCard from "./B2bEmployeeOverviewCard";
import B2bLayoutValidationPanel from "./B2bLayoutValidationPanel";
import B2bNoteEditorPanel from "./B2bNoteEditorPanel";
import B2bSurveyEditorPanel from "./B2bSurveyEditorPanel";
import type { B2bAdminReportWorkspaceLoadedProps } from "./B2bAdminReportWorkspace.types";

export default function B2bAdminReportWorkspaceLoaded({
  selectedEmployee,
  content,
  actions,
}: B2bAdminReportWorkspaceLoadedProps) {
  return (
    <>
      <B2bEmployeeOverviewCard
        detail={selectedEmployee}
        latestReport={content.latestReport}
        selectedPeriodKey={content.selectedPeriodKey}
        periodOptions={content.periodOptions}
        reportDisplayPeriodKey={content.reportDisplayPeriodKey}
        busy={content.busy}
        onPeriodChange={actions.onPeriodChange}
        onReportDisplayPeriodChange={actions.onReportDisplayPeriodChange}
        onSaveReportDisplayPeriod={actions.onSaveReportDisplayPeriod}
        onExportPdf={actions.onExportPdf}
        onExportLegacyPdf={actions.onExportLegacyPdf}
        onRegenerateReport={actions.onRegenerateReport}
        onRecomputeAnalysis={actions.onRecomputeAnalysis}
      />

      <B2bAdminReportPreviewPanel
        previewTab={content.previewTab}
        latestLayout={content.latestLayout}
        latestPayload={content.latestReport?.payload}
        captureRef={content.captureRef}
        onPreviewTabChange={actions.onPreviewTabChange}
      />

      <B2bSurveyEditorPanel
        completionStats={content.completionStats}
        surveySubmittedAt={content.surveySubmittedAt}
        surveyUpdatedAt={content.surveyUpdatedAt}
        surveyTemplate={content.surveyTemplate}
        selectedSections={content.selectedSections}
        selectedSectionSet={content.selectedSectionSet}
        surveyAnswers={content.surveyAnswers}
        maxSelectedSections={content.maxSelectedSections}
        busy={content.busy}
        onToggleSection={actions.onToggleSection}
        onSetAnswerValue={actions.onSetAnswerValue}
        onSaveSurvey={actions.onSaveSurvey}
      />

      <B2bNoteEditorPanel
        note={content.note}
        recommendations={content.recommendations}
        cautions={content.cautions}
        busy={content.busy}
        onNoteChange={actions.onNoteChange}
        onRecommendationsChange={actions.onRecommendationsChange}
        onCautionsChange={actions.onCautionsChange}
        onSave={actions.onSaveNote}
      />

      <B2bAnalysisJsonPanel
        analysisText={content.analysisText}
        busy={content.busy}
        onAnalysisTextChange={actions.onAnalysisTextChange}
        onSave={actions.onSaveAnalysis}
      />

      <B2bLayoutValidationPanel
        busy={content.busy}
        latestReportId={content.latestReport?.id ?? null}
        showExportPreview={content.showExportPreview}
        latestLayout={content.latestLayout}
        validationAudit={content.validationAudit}
        validationIssues={content.validationIssues}
        onRunValidation={actions.onRunValidation}
        onTogglePreview={actions.onToggleValidationPreview}
      />
    </>
  );
}
