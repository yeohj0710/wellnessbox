import type {
  SectionAdviceLine,
  SupplementRow,
  SurveyDetailPageModel,
} from "./SurveyDetailPages";
import { hasSurveyDetailPageContent } from "./SurveyDetailPages";

const FIRST_PAGE_SURVEY_CONTENT_UNITS = 760;
const DETAIL_PAGE_SURVEY_CONTENT_UNITS = 1200;
const ROUTINE_CARD_BASE_UNITS = 84;
const ROUTINE_ROW_BASE_UNITS = 38;
// Section advice cards carry noticeably more chrome in the in-app employee preview
// (card head, section header, badge, wrapper padding) than the old budget assumed.
// Keeping these bases conservative prevents the last group from being clipped.
const SECTION_CARD_BASE_UNITS = 102;
const SECTION_GROUP_BASE_UNITS = 32;
const SECTION_ROW_BASE_UNITS = 76;
const SUPPLEMENT_CARD_BASE_UNITS = 98;
const SUPPLEMENT_ROW_BASE_UNITS = 58;
const ROUTINE_ROW_CHUNK_MAX_CHARS = 134;
const SECTION_RECOMMENDATION_CHUNK_MAX_CHARS = 112;
const SUPPLEMENT_PARAGRAPH_CHUNK_MAX_CHARS = 180;
const SUPPLEMENT_PARAGRAPHS_PER_ROW = 1;
const SUPPLEMENT_NUTRIENTS_PER_ROW = 6;
const SUPPLEMENT_ROW_SAFETY_UNITS = 18;

function estimateTextUnits(text: string, charsPerUnit: number) {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / Math.max(8, charsPerUnit)));
}

function estimateWrappedTextUnits(
  text: string,
  charsPerLine: number,
  lineHeightUnits: number
) {
  return estimateTextUnits(text, charsPerLine) * lineHeightUnits;
}

function splitLongTextForPagination(text: string, maxCharsPerChunk: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [] as string[];
  if (normalized.length <= maxCharsPerChunk) return [normalized];

  const sentenceParts = (normalized.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((part) => part.trim())
    .filter(Boolean);

  const parts = sentenceParts.length > 0 ? sentenceParts : [normalized];
  const chunks: string[] = [];
  let buffer = "";

  const flushBuffer = () => {
    const value = buffer.trim();
    if (value) chunks.push(value);
    buffer = "";
  };

  for (const part of parts) {
    if (part.length > maxCharsPerChunk) {
      flushBuffer();
      let cursor = part;
      while (cursor.length > maxCharsPerChunk) {
        let cut = cursor.lastIndexOf(" ", maxCharsPerChunk);
        if (cut < Math.floor(maxCharsPerChunk * 0.55)) {
          cut = cursor.lastIndexOf(",", maxCharsPerChunk);
        }
        if (cut < Math.floor(maxCharsPerChunk * 0.45)) {
          cut = maxCharsPerChunk;
        }
        const head = cursor.slice(0, cut).trim();
        if (head) chunks.push(head);
        cursor = cursor.slice(cut).trim();
      }
      if (cursor) {
        buffer = cursor;
      }
      continue;
    }

    const candidate = buffer ? `${buffer} ${part}` : part;
    if (candidate.length > maxCharsPerChunk && buffer) {
      flushBuffer();
      buffer = part;
      continue;
    }
    buffer = candidate;
  }

  flushBuffer();
  return chunks.length > 0 ? chunks : [normalized];
}

function normalizeSectionGroupKey(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function resolveSectionGroupTitle(line: SectionAdviceLine) {
  const sectionTitle = line.sectionTitle.trim();
  const questionText = line.questionText.trim();
  const prefixMatch = questionText.match(/^(.+?)\s*(?::|·|-)\s*(.+)$/u);

  if (!sectionTitle || sectionTitle === "-") {
    if (prefixMatch?.[1]) {
      return prefixMatch[1].trim();
    }
    return "section";
  }

  if (prefixMatch?.[1]) {
    const prefixTitle = prefixMatch[1].trim();
    if (normalizeSectionGroupKey(prefixTitle) === normalizeSectionGroupKey(sectionTitle)) {
      return sectionTitle;
    }
  }

  return sectionTitle;
}

function resolveSectionGroupKey(line: SectionAdviceLine) {
  return normalizeSectionGroupKey(resolveSectionGroupTitle(line));
}

function estimateRoutineRowUnits(line: string) {
  return ROUTINE_ROW_BASE_UNITS + estimateWrappedTextUnits(line, 34, 19);
}

function estimateSectionAdviceRowUnits(line: SectionAdviceLine) {
  const recommendationWeightMultiplier = line.continuation ? 1.08 : 1;
  return (
    SECTION_ROW_BASE_UNITS +
    estimateWrappedTextUnits(line.questionText, 34, 18) +
    estimateWrappedTextUnits(line.answerText, 34, 16) +
    estimateWrappedTextUnits(line.recommendation, 34, 18) * recommendationWeightMultiplier
  );
}

function estimateSupplementRowUnits(row: SupplementRow) {
  const headingUnits = row.showSectionTitle ? 38 : 26;
  const continuationUnits = row.continuation ? 12 : 0;
  const paragraphUnits = row.paragraphs.reduce((sum, paragraph) => {
    return sum + estimateWrappedTextUnits(paragraph, 34, 18);
  }, 0);
  const nutrientCount = row.recommendedNutrients.length;
  const nutrientRows =
    nutrientCount > 0 ? Math.ceil(nutrientCount / SUPPLEMENT_NUTRIENTS_PER_ROW) : 0;
  const nutrientUnits = nutrientCount > 0 ? 48 + nutrientRows * 18 : 0;
  return (
    SUPPLEMENT_ROW_BASE_UNITS +
    headingUnits +
    continuationUnits +
    paragraphUnits +
    nutrientUnits +
    SUPPLEMENT_ROW_SAFETY_UNITS
  );
}

export function createEmptySurveyDetailPage(): SurveyDetailPageModel {
  return {
    routineRows: [],
    sectionAdviceRows: [],
    supplementRows: [],
  };
}

function normalizeContinuationTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/\(\s*계속\s*\)$/u, "").trim();
}

function chunkArray<T>(items: T[], size: number) {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks;
}

function expandRoutineLinesForPagination(lines: string[]) {
  return lines.flatMap((line) => splitLongTextForPagination(line, ROUTINE_ROW_CHUNK_MAX_CHARS));
}

function expandSectionAdviceLinesForPagination(lines: SectionAdviceLine[]) {
  return lines.flatMap((line) => {
    const recommendationChunks = splitLongTextForPagination(
      line.recommendation,
      SECTION_RECOMMENDATION_CHUNK_MAX_CHARS
    );
    if (recommendationChunks.length <= 1) return [line];

    return recommendationChunks.map((chunk, chunkIndex) => ({
      ...line,
      key: `${line.key}::chunk-${chunkIndex}`,
      questionText: chunkIndex === 0 ? line.questionText : "",
      answerText: chunkIndex === 0 ? line.answerText : "",
      recommendation: chunk,
      continuation: chunkIndex > 0,
    }));
  });
}

function expandSupplementRowsForPagination(rows: SupplementRow[]) {
  return rows.flatMap((row) => {
    const paragraphChunks = row.paragraphs.flatMap((paragraph) =>
      splitLongTextForPagination(paragraph, SUPPLEMENT_PARAGRAPH_CHUNK_MAX_CHARS)
    );
    const groupedParagraphs =
      paragraphChunks.length > 0 ? chunkArray(paragraphChunks, SUPPLEMENT_PARAGRAPHS_PER_ROW) : [[]];
    const groupedNutrients =
      row.recommendedNutrients.length > 0
        ? chunkArray(row.recommendedNutrients, SUPPLEMENT_NUTRIENTS_PER_ROW)
        : [[]];
    const groupCount = Math.max(groupedParagraphs.length, groupedNutrients.length);

    return Array.from({ length: groupCount }, (_, groupIndex) => {
      const isContinuation = groupIndex > 0;
      return {
        ...row,
        title: isContinuation ? normalizeContinuationTitle(row.title || row.sectionTitle) : row.title,
        showSectionTitle: isContinuation ? false : row.showSectionTitle,
        paragraphs: groupedParagraphs[groupIndex] ?? [],
        recommendedNutrients: groupedNutrients[groupIndex] ?? [],
        continuation: isContinuation,
      };
    }).filter(
      (fragment, fragmentIndex) =>
        fragmentIndex === 0 ||
        fragment.paragraphs.length > 0 ||
        fragment.recommendedNutrients.length > 0
    );
  });
}

function pageHasTypeRows(page: SurveyDetailPageModel, type: "routine" | "section" | "supplement") {
  if (type === "routine") return page.routineRows.length > 0;
  if (type === "section") return page.sectionAdviceRows.length > 0;
  return page.supplementRows.length > 0;
}

function appendTypeRows(
  page: SurveyDetailPageModel,
  type: "routine" | "section" | "supplement",
  rows: Array<string | SectionAdviceLine | SupplementRow>
) {
  if (rows.length === 0) return;
  if (type === "routine") {
    page.routineRows = [...page.routineRows, ...(rows as string[])];
    return;
  }
  if (type === "section") {
    page.sectionAdviceRows = [...page.sectionAdviceRows, ...(rows as SectionAdviceLine[])];
    return;
  }
  page.supplementRows = [...page.supplementRows, ...(rows as SupplementRow[])];
}

export function buildSurveyDetailPages(input: {
  routineLines: string[];
  sectionAdviceLines: SectionAdviceLine[];
  supplementRows: SupplementRow[];
}) {
  const routineLines = expandRoutineLinesForPagination(input.routineLines);
  const sectionAdviceLines = expandSectionAdviceLinesForPagination(input.sectionAdviceLines);
  const supplementRows = expandSupplementRowsForPagination(input.supplementRows);

  if (
    routineLines.length === 0 &&
    sectionAdviceLines.length === 0 &&
    supplementRows.length === 0
  ) {
    return [] as SurveyDetailPageModel[];
  }

  const segments: Array<{
    type: "routine" | "section" | "supplement";
    items: string[] | SectionAdviceLine[] | SupplementRow[];
    estimate: (item: string | SectionAdviceLine | SupplementRow) => number;
    baseUnits: number;
  }> = [
    {
      type: "routine",
      items: routineLines,
      estimate: (item) => estimateRoutineRowUnits(item as string),
      baseUnits: ROUTINE_CARD_BASE_UNITS,
    },
    {
      type: "section",
      items: sectionAdviceLines,
      estimate: (item) => estimateSectionAdviceRowUnits(item as SectionAdviceLine),
      baseUnits: SECTION_CARD_BASE_UNITS,
    },
    {
      type: "supplement",
      items: supplementRows,
      estimate: (item) => estimateSupplementRowUnits(item as SupplementRow),
      baseUnits: SUPPLEMENT_CARD_BASE_UNITS,
    },
  ];

  const getPageBudget = (pageIndex: number) =>
    pageIndex === 0 ? FIRST_PAGE_SURVEY_CONTENT_UNITS : DETAIL_PAGE_SURVEY_CONTENT_UNITS;

  const pages: SurveyDetailPageModel[] = [];
  let currentPage = createEmptySurveyDetailPage();
  let currentUnits = 0;
  let pageIndex = 0;

  const pushCurrentPage = () => {
    if (hasSurveyDetailPageContent(currentPage)) {
      pages.push(currentPage);
      currentPage = createEmptySurveyDetailPage();
      currentUnits = 0;
      pageIndex += 1;
    }
  };

  for (const segment of segments) {
    if (segment.items.length === 0) continue;
    let cursor = 0;

    while (cursor < segment.items.length) {
      const pageBudget = getPageBudget(pageIndex);
      const alreadyHasTypeRows = pageHasTypeRows(currentPage, segment.type);
      const baseUnits = alreadyHasTypeRows ? 0 : segment.baseUnits;
      const remainingUnits = pageBudget - currentUnits;

      if (remainingUnits <= baseUnits) {
        pushCurrentPage();
        continue;
      }

      let takeCount = 0;
      let takenUnits = baseUnits;
      const existingSectionGroupKeys =
        segment.type === "section"
          ? new Set(currentPage.sectionAdviceRows.map((row) => resolveSectionGroupKey(row)))
          : null;
      const pickedSectionGroupKeys = new Set<string>();

      while (cursor + takeCount < segment.items.length) {
        const item = segment.items[cursor + takeCount];
        let additionalUnits = 0;
        if (segment.type === "section") {
          const groupKey = resolveSectionGroupKey(item as SectionAdviceLine);
          const hasExistingGroup =
            !!groupKey &&
            (existingSectionGroupKeys?.has(groupKey) || pickedSectionGroupKeys.has(groupKey));
          if (!hasExistingGroup) {
            additionalUnits += SECTION_GROUP_BASE_UNITS;
            if (groupKey) pickedSectionGroupKeys.add(groupKey);
          }
        }
        const nextUnits = Math.max(1, segment.estimate(item)) + additionalUnits;
        if (takenUnits + nextUnits > remainingUnits) break;
        takenUnits += nextUnits;
        takeCount += 1;
      }

      if (takeCount === 0) {
        if (currentUnits > 0) {
          pushCurrentPage();
          continue;
        }
        const forcedItem = segment.items[cursor];
        const forcedAdditionalUnits = segment.type === "section" ? SECTION_GROUP_BASE_UNITS : 0;
        const forcedUnits = Math.max(1, segment.estimate(forcedItem));
        appendTypeRows(currentPage, segment.type, [forcedItem]);
        currentUnits += baseUnits + forcedAdditionalUnits + forcedUnits;
        cursor += 1;
        continue;
      }

      const picked = segment.items.slice(cursor, cursor + takeCount);
      appendTypeRows(currentPage, segment.type, picked);
      currentUnits += takenUnits;
      cursor += takeCount;
    }
  }

  pushCurrentPage();
  return pages;
}
