"use client";

import { useMemo } from "react";
import SurveyResultPanel from "@/app/survey/_components/SurveyResultPanel";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  B2B_INTEGRATED_SURVEY_RESULT_TEXT,
  buildB2bIntegratedResultPreviewModel,
} from "../_lib/b2b-integrated-result-preview-model";
import B2bIntegratedHealthMetricsSection from "./B2bIntegratedHealthMetricsSection";
import B2bIntegratedMedicationReviewSection from "./B2bIntegratedMedicationReviewSection";

type B2bIntegratedResultPreviewProps = {
  payload: ReportSummaryPayload | null | undefined;
};

export default function B2bIntegratedResultPreview({
  payload,
}: B2bIntegratedResultPreviewProps) {
  const previewModel = useMemo(() => buildB2bIntegratedResultPreviewModel(payload), [payload]);

  return (
    <div className="space-y-4" data-testid="admin-integrated-preview">
      <SurveyResultPanel
        resultSummary={previewModel.resultSummary}
        sectionTitleMap={previewModel.sectionTitleMap}
        text={B2B_INTEGRATED_SURVEY_RESULT_TEXT}
        onEditSurvey={() => undefined}
        onRestart={() => undefined}
        onOpenEmployeeReport={() => undefined}
        hideActionSection
      />

      <B2bIntegratedHealthMetricsSection metrics={previewModel.healthMetrics} />

      <B2bIntegratedMedicationReviewSection
        medicationStatusMessage={previewModel.medicationStatusMessage}
        medications={previewModel.medications}
        pharmacistSummary={previewModel.pharmacistSummary}
        pharmacistRecommendations={previewModel.pharmacistRecommendations}
        pharmacistCautions={previewModel.pharmacistCautions}
      />
    </div>
  );
}
