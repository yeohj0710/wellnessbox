"use client";

import styles from "./B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { firstOrDash, formatDate } from "./report-summary/helpers";
import { ensureSentence } from "./report-summary/card-insights";
import {
  buildMedicationMetaLine,
  buildReportSummaryHealthMetrics,
  buildReportSummaryMedicationReviewModel,
} from "./report-summary/detail-data-model";
import {
  REPORT_SUMMARY_HEALTH_INSIGHT_EMPTY_MESSAGE,
  REPORT_SUMMARY_HEALTH_PAGE_TEXT,
  REPORT_SUMMARY_MEDICATION_PAGE_TEXT,
  REPORT_SUMMARY_OVERVIEW_TEXT,
} from "./report-summary/copy";
import {
  buildReportSummaryOverviewModel,
  REPORT_SUMMARY_DONUT_CIRCUMFERENCE,
  REPORT_SUMMARY_DONUT_RADIUS,
  REPORT_SUMMARY_RADAR_CENTER_X,
  REPORT_SUMMARY_RADAR_CENTER_Y,
  REPORT_SUMMARY_RADAR_LEVELS,
} from "./report-summary/overview-model";
import {
  ReportSummaryHealthPage,
  ReportSummaryMedicationPage,
  ReportSummaryOverviewPage,
} from "./report-summary/ReportSummaryPages";
import {
  buildReportSummarySurveyDetailModel,
  REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START,
} from "./report-summary/survey-detail-model";
import SurveyDetailPages from "./report-summary/SurveyDetailPages";

export default function ReportSummaryCards(props: {
  payload: ReportSummaryPayload | null | undefined;
  viewerMode?: "employee" | "admin";
}) {
  const payload = props.payload;
  const viewerMode = props.viewerMode ?? "admin";

  if (!payload) {
    return (
      <section className={styles.sectionCard}>
        <p className={styles.inlineHint}>아직 생성된 리포트 데이터가 없습니다.</p>
      </section>
    );
  }

  const overviewModel = buildReportSummaryOverviewModel(payload);
  const {
    donutOffset,
    resolvedHealthScore,
    lifestyleOverallText,
    healthNeedAverageText,
    radarAxes,
    radarAreaPoints,
    sectionNeedsForPage1,
    hiddenSectionNeedCount,
    sectionTitleById,
  } = overviewModel;
  const surveyDetailModel = buildReportSummarySurveyDetailModel({
    payload,
    sectionTitleById,
  });
  const {
    firstPageSurveyDetails,
    continuationSurveyPages,
    hasFirstPageSurveyContent,
    hasSectionAdviceContent,
    healthDataPageNumber,
    medicationPageNumber,
  } = surveyDetailModel;

  const healthMetrics = buildReportSummaryHealthMetrics(payload);

  const medicationReviewModel = buildReportSummaryMedicationReviewModel(payload);
  const medicationsAll = medicationReviewModel.medications;
  const medications = medicationsAll;

  const medicationStatusMessage = medicationReviewModel.medicationStatusMessage;

  const pharmacistSummary = medicationReviewModel.pharmacistSummary;
  const pharmacistRecommendations = medicationReviewModel.pharmacistRecommendations;
  const pharmacistCautions = medicationReviewModel.pharmacistCautions;
  const metaEmployeeName = firstOrDash(payload.meta?.employeeName);
  const metaPeriodKey = firstOrDash(payload.meta?.periodKey);
  const metaGeneratedAt = formatDate(payload.meta?.generatedAt);
  const metaIsMockData = Boolean(payload.meta?.isMockData);
  const medicationStatusLead = ensureSentence(medicationStatusMessage);

  return (
    <div className={styles.reportDocument} data-report-document="1">
      <ReportSummaryOverviewPage
        donutRadius={REPORT_SUMMARY_DONUT_RADIUS}
        donutCircumference={REPORT_SUMMARY_DONUT_CIRCUMFERENCE}
        donutOffset={donutOffset}
        radarLevels={[...REPORT_SUMMARY_RADAR_LEVELS]}
        radarCenterX={REPORT_SUMMARY_RADAR_CENTER_X}
        radarCenterY={REPORT_SUMMARY_RADAR_CENTER_Y}
        radarAxes={radarAxes}
        radarAreaPoints={radarAreaPoints}
        resolvedHealthScore={resolvedHealthScore}
        lifestyleOverallText={lifestyleOverallText}
        sectionNeedsForPage1={sectionNeedsForPage1}
        healthNeedAverageText={healthNeedAverageText}
        hiddenSectionNeedCount={hiddenSectionNeedCount}
        firstPageSurveyDetails={firstPageSurveyDetails}
        hasFirstPageSurveyContent={hasFirstPageSurveyContent}
        hasSectionAdviceContent={hasSectionAdviceContent}
        metaEmployeeName={metaEmployeeName}
        metaPeriodKey={metaPeriodKey}
        metaGeneratedAt={metaGeneratedAt}
        text={REPORT_SUMMARY_OVERVIEW_TEXT}
      />

      <SurveyDetailPages
        surveyDetailPageStart={REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START}
        surveyPages={continuationSurveyPages}
        showSectionAdviceEmptyOnFirstPage={!hasSectionAdviceContent && !hasFirstPageSurveyContent}
      />

      <ReportSummaryHealthPage
        pageNumber={healthDataPageNumber}
        healthMetrics={healthMetrics}
        healthInsightEmptyMessage={REPORT_SUMMARY_HEALTH_INSIGHT_EMPTY_MESSAGE}
        text={REPORT_SUMMARY_HEALTH_PAGE_TEXT}
      />

      <ReportSummaryMedicationPage
        pageNumber={medicationPageNumber}
        medications={medications}
        medicationStatusMessage={medicationStatusLead}
        pharmacistSummary={pharmacistSummary}
        pharmacistRecommendations={pharmacistRecommendations}
        pharmacistCautions={pharmacistCautions}
        viewerMode={viewerMode}
        metaGeneratedAt={metaGeneratedAt}
        metaEmployeeName={metaEmployeeName}
        metaPeriodKey={metaPeriodKey}
        metaIsMockData={metaIsMockData}
        buildMedicationMetaLine={buildMedicationMetaLine}
        text={REPORT_SUMMARY_MEDICATION_PAGE_TEXT}
      />
    </div>
  );
}
