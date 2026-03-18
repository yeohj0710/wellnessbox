"use client";

import styles from "./B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { firstOrDash, formatDate } from "./report-summary/helpers";
import ReportSummaryAddendumPage from "./report-summary/ReportSummaryAddendumPage";
import {
  buildReportSummaryAddendumPages,
  buildReportSummaryHealthMetrics,
  hasReportSummaryHealthMetricsContent,
} from "./report-summary/detail-data-model";
import {
  REPORT_SUMMARY_HEALTH_INSIGHT_EMPTY_MESSAGE,
  REPORT_SUMMARY_HEALTH_PAGE_TEXT,
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
  ReportSummaryOverviewPage,
} from "./report-summary/ReportSummaryPages";
import {
  buildReportSummarySurveyDetailModel,
  REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START,
} from "./report-summary/survey-detail-model";
import SurveyDetailPages from "./report-summary/SurveyDetailPages";

export default function ReportSummaryCards(props: {
  payload: ReportSummaryPayload | null | undefined;
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
  const addendumPages = buildReportSummaryAddendumPages(payload);
  const metaEmployeeName = firstOrDash(payload.meta?.employeeName);
  const metaPeriodKey = firstOrDash(payload.meta?.periodKey);
  const metaGeneratedAt = formatDate(payload.meta?.generatedAt);
  const addendumPageStart = healthDataPageNumber + (showHealthPage ? 1 : 0);

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
          healthInsightEmptyMessage={REPORT_SUMMARY_HEALTH_INSIGHT_EMPTY_MESSAGE}
          text={REPORT_SUMMARY_HEALTH_PAGE_TEXT}
        />
      ) : null}

      {addendumPages.map((addendum, index) => (
        <ReportSummaryAddendumPage
          key={`report-addendum-${index + 1}`}
          pageNumber={addendumPageStart + index}
          metaEmployeeName={metaEmployeeName}
          addendum={addendum}
          isContinuation={index > 0}
        />
      ))}
    </div>
  );
}
