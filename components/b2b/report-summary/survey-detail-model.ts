import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  buildDetailedSectionAdviceLines,
  ensureSentence,
  toTrimmedText,
} from "./card-insights";
import { ensureArray } from "./helpers";
import {
  buildSurveyDetailPages,
  createEmptySurveyDetailPage,
} from "./survey-detail-pagination";
import type { SurveyDetailPageModel } from "./SurveyDetailPages";
import { hasSurveyDetailPageContent } from "./SurveyDetailPages";

export const REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START = 2;

export type ReportSummarySurveyDetailModel = {
  firstPageSurveyDetails: SurveyDetailPageModel;
  continuationSurveyPages: SurveyDetailPageModel[];
  hasFirstPageSurveyContent: boolean;
  hasSectionAdviceContent: boolean;
  healthDataPageNumber: number;
};

export function buildReportSummarySurveyDetailModel(input: {
  payload: ReportSummaryPayload;
}): ReportSummarySurveyDetailModel {
  const wellness = input.payload.analysis?.wellness;
  const detailedSectionAdviceLines = buildDetailedSectionAdviceLines(
    input.payload,
    Number.POSITIVE_INFINITY
  );
  const hasSectionAdviceContent = detailedSectionAdviceLines.length > 0;
  const routineLines = ensureArray(wellness?.lifestyleRoutineAdvice)
    .map((item) => ensureSentence(toTrimmedText(item)))
    .filter(Boolean);

  const surveyPages = buildSurveyDetailPages({
    routineLines,
    sectionAdviceLines: detailedSectionAdviceLines,
    supplementRows: [],
  });
  const firstPageSurveyDetails = surveyPages[0] ?? createEmptySurveyDetailPage();
  const continuationSurveyPages = surveyPages.slice(1);
  const hasFirstPageSurveyContent =
    hasSurveyDetailPageContent(firstPageSurveyDetails);
  const healthDataPageNumber =
    REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START + continuationSurveyPages.length;

  return {
    firstPageSurveyDetails,
    continuationSurveyPages,
    hasFirstPageSurveyContent,
    hasSectionAdviceContent,
    healthDataPageNumber,
  };
}
