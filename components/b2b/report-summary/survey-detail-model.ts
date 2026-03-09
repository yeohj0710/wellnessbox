import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  buildDetailedSectionAdviceLines,
  ensureSentence,
  sanitizeTitle,
  toTrimmedText,
} from "./card-insights";
import { ensureArray, firstOrDash } from "./helpers";
import {
  buildSurveyDetailPages,
  createEmptySurveyDetailPage,
} from "./survey-detail-pagination";
import type { SupplementRow, SurveyDetailPageModel } from "./SurveyDetailPages";
import { hasSurveyDetailPageContent } from "./SurveyDetailPages";

export const REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START = 2;

export type ReportSummarySurveyDetailModel = {
  firstPageSurveyDetails: SurveyDetailPageModel;
  continuationSurveyPages: SurveyDetailPageModel[];
  hasFirstPageSurveyContent: boolean;
  hasSectionAdviceContent: boolean;
  healthDataPageNumber: number;
  medicationPageNumber: number;
};

function normalizeSupplementHeadingText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildSupplementRows(input: {
  payload: ReportSummaryPayload;
  sectionTitleById: Map<string, string>;
}): SupplementRow[] {
  const wellness = input.payload.analysis?.wellness;

  return ensureArray(wellness?.supplementDesign).map((item) => {
    const sectionId = firstOrDash(item?.sectionId);
    const sectionTitle =
      input.sectionTitleById.get(sectionId) || sanitizeTitle(sectionId);
    const title = sanitizeTitle(firstOrDash(item?.title));
    const showSectionTitle =
      normalizeSupplementHeadingText(sectionTitle) !==
      normalizeSupplementHeadingText(title);

    return {
      sectionId,
      sectionTitle,
      title,
      showSectionTitle,
      paragraphs: ensureArray(item?.paragraphs)
        .map((paragraph) => ensureSentence(toTrimmedText(paragraph)))
        .filter(Boolean),
      recommendedNutrients: ensureArray(item?.recommendedNutrients)
        .map((nutrient) =>
          sanitizeTitle(firstOrDash(nutrient?.labelKo || nutrient?.label))
        )
        .filter(Boolean),
    };
  });
}

export function buildReportSummarySurveyDetailModel(input: {
  payload: ReportSummaryPayload;
  sectionTitleById: Map<string, string>;
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
  const supplementRows = buildSupplementRows({
    payload: input.payload,
    sectionTitleById: input.sectionTitleById,
  });

  const surveyPages = buildSurveyDetailPages({
    routineLines,
    sectionAdviceLines: detailedSectionAdviceLines,
    supplementRows,
  });
  const firstPageSurveyDetails = surveyPages[0] ?? createEmptySurveyDetailPage();
  const continuationSurveyPages = surveyPages.slice(1);
  const hasFirstPageSurveyContent =
    hasSurveyDetailPageContent(firstPageSurveyDetails);
  const healthDataPageNumber =
    REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START + continuationSurveyPages.length;
  const medicationPageNumber = healthDataPageNumber + 1;

  return {
    firstPageSurveyDetails,
    continuationSurveyPages,
    hasFirstPageSurveyContent,
    hasSectionAdviceContent,
    healthDataPageNumber,
    medicationPageNumber,
  };
}
