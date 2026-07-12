"use client";

import styles from "./B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { firstOrDash, formatDate } from "./report-summary/helpers";
import ReportSummaryAddendumPage from "./report-summary/ReportSummaryAddendumPage";
import {
  buildReportSummaryAddendumPages,
  buildReportSummaryHealthMetrics,
  buildReportSummaryMedicationReviewModel,
  buildMedicationMetaLine,
  hasReportSummaryHealthMetricsContent,
} from "./report-summary/detail-data-model";
import {
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

  if (!payload) {
    return (
      <section className={styles.sectionCard}>
        <p className={styles.inlineHint}>아직 생성된 레포트 데이터가 없습니다.</p>
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
  } = overviewModel;
  const surveyDetailModel = buildReportSummarySurveyDetailModel({
    payload,
  });
  const {
    firstPageSurveyDetails,
    continuationSurveyPages,
    hasFirstPageSurveyContent,
    hasSectionAdviceContent,
    healthDataPageNumber,
  } = surveyDetailModel;

  const healthMetrics = buildReportSummaryHealthMetrics(payload);
  const showHealthPage = hasReportSummaryHealthMetricsContent(healthMetrics);
  const medicationReview = buildReportSummaryMedicationReviewModel(payload);
  const medicationsAll = medicationReview.medications;
  const medications = medicationsAll;
  const showMedicationPage = medications.length > 0 || medicationReview.medicationStatusMessage.length > 0;
  const medicationPageNumber = healthDataPageNumber + (showHealthPage ? 1 : 0);
  const addendumPages = buildReportSummaryAddendumPages(payload);
  const metaEmployeeName = firstOrDash(payload.meta?.employeeName);
  const metaPeriodKey = firstOrDash(payload.meta?.periodKey);
  const metaGeneratedAt = formatDate(payload.meta?.generatedAt);
  const addendumPageStart = medicationPageNumber + (showMedicationPage ? 1 : 0);

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
        showSectionAdviceEmptyOnFirstPage={
          !hasSectionAdviceContent && !hasFirstPageSurveyContent
        }
      />

      {showHealthPage ? (
        <ReportSummaryHealthPage
          pageNumber={healthDataPageNumber}
          healthMetrics={healthMetrics}
          text={REPORT_SUMMARY_HEALTH_PAGE_TEXT}
        />
      ) : null}

      {showMedicationPage ? (
        <ReportSummaryMedicationPage
          pageNumber={medicationPageNumber}
          medications={medications}
          medicationStatusMessage={medicationReview.medicationStatusMessage}
          viewerMode={props.viewerMode ?? "employee"}
          metaGeneratedAt={metaGeneratedAt}
          metaEmployeeName={metaEmployeeName}
          metaPeriodKey={metaPeriodKey}
          metaIsMockData={payload.meta?.isMockData === true}
          buildMedicationMetaLine={buildMedicationMetaLine}
          text={REPORT_SUMMARY_MEDICATION_PAGE_TEXT}
        />
      ) : null}

      {addendumPages.map((addendum, index) => (
        <ReportSummaryAddendumPage
          key={`report-addendum-${index + 1}`}
          pageNumber={addendumPageStart + index}
          addendum={addendum}
          isContinuation={index > 0}
        />
      ))}
    </div>
  );
}
