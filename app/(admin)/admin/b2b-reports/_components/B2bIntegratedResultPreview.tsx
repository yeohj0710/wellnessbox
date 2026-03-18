"use client";

import { useMemo } from "react";
import SurveyResultPanel from "@/app/survey/_components/SurveyResultPanel";
import ResultSectionEmptyState from "@/components/common/resultSectionEmptyState";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  B2B_INTEGRATED_SURVEY_RESULT_TEXT,
  buildB2bIntegratedResultPreviewModel,
} from "../_lib/b2b-integrated-result-preview-model";
import B2bIntegratedHealthMetricsSection from "./B2bIntegratedHealthMetricsSection";

type B2bIntegratedResultPreviewProps = {
  payload: ReportSummaryPayload | null | undefined;
};

export default function B2bIntegratedResultPreview({
  payload,
}: B2bIntegratedResultPreviewProps) {
  const previewModel = useMemo(() => buildB2bIntegratedResultPreviewModel(payload), [payload]);
  const hasSurveyAnswers = (payload?.survey?.answers?.length ?? 0) > 0;
  const hasSurveyResult = Boolean(previewModel.resultSummary);

  return (
    <div className="space-y-4" data-testid="admin-integrated-preview">
      {hasSurveyResult ? (
        <SurveyResultPanel
          resultSummary={previewModel.resultSummary}
          sectionTitleMap={previewModel.sectionTitleMap}
          text={B2B_INTEGRATED_SURVEY_RESULT_TEXT}
          onEditSurvey={() => undefined}
          onRestart={() => undefined}
          onOpenEmployeeReport={() => undefined}
          hideActionSection
          hideSupplementSection
        />
      ) : (
        <div className="mx-auto max-w-[840px] rounded-[26px] border border-sky-100/70 bg-white/82 p-5 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur sm:p-7">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {B2B_INTEGRATED_SURVEY_RESULT_TEXT.resultTitle}
          </h2>
          <ResultSectionEmptyState
            message={
              hasSurveyAnswers
                ? "설문 응답은 있지만 아직 분석 결과를 만들 수 없습니다."
                : "설문 응답 데이터가 없어 표시할 설문 결과가 없습니다."
            }
          />
        </div>
      )}

      <B2bIntegratedHealthMetricsSection metrics={previewModel.healthMetrics} />
    </div>
  );
}
