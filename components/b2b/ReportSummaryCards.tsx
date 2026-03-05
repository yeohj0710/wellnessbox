"use client";

import styles from "./B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  ensureArray,
  firstOrDash,
  formatDate,
  toScoreLabel,
  toScoreValue,
} from "./report-summary/helpers";
import {
  buildDetailedSectionAdviceLines,
  clampPercent,
  ensureSentence,
  formatMetricValue,
  resolveHealthScoreLabel,
  resolveMetricStatusLabel,
  sanitizeTitle,
  softenAdviceTone,
  toTrimmedText,
} from "./report-summary/card-insights";
import SurveyDetailPages, {
  SurveyDetailCards,
  hasSurveyDetailPageContent,
  type SectionAdviceLine,
  type SupplementRow,
  type SurveyDetailPageModel,
} from "./report-summary/SurveyDetailPages";

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const MAX_PAGE1_SECTION_BARS = 3;
const FIRST_PAGE_SURVEY_CONTENT_UNITS = 700;
const DETAIL_PAGE_SURVEY_CONTENT_UNITS = 1180;
const ROUTINE_CARD_BASE_UNITS = 108;
const ROUTINE_ROW_BASE_UNITS = 48;
const SECTION_CARD_BASE_UNITS = 112;
const SECTION_GROUP_BASE_UNITS = 34;
const SECTION_ROW_BASE_UNITS = 90;
const SUPPLEMENT_CARD_BASE_UNITS = 122;
const SUPPLEMENT_ROW_BASE_UNITS = 72;
const ROUTINE_ROW_CHUNK_MAX_CHARS = 110;
const SECTION_RECOMMENDATION_CHUNK_MAX_CHARS = 130;
const SUPPLEMENT_PARAGRAPH_CHUNK_MAX_CHARS = 150;
const SUPPLEMENT_PARAGRAPHS_PER_ROW = 1;
const SUPPLEMENT_NUTRIENTS_PER_ROW = 6;
const SUPPLEMENT_ROW_SAFETY_UNITS = 30;

const LIFESTYLE_RISK_LABEL_BY_ID: Record<string, string> = {
  diet: "식습관 위험도",
  activity: "활동량 위험도",
  immune: "면역관리 위험도",
  sleep: "수면 위험도",
};

const LIFESTYLE_RISK_BASE_LABEL_BY_NAME: Record<string, string> = {
  식습관: "식습관",
  활동량: "활동량",
  면역관리: "면역관리",
  수면: "수면",
};

function toMedicationMetaDate(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return text;
}

function buildMedicationMetaLine(input: {
  date: string;
  hospitalName: string;
}) {
  const parts = [input.date, input.hospitalName].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

function toLifestyleRiskLabel(input: { id?: string; label?: string }) {
  const normalizedId = toTrimmedText(input.id).toLowerCase();
  if (normalizedId && LIFESTYLE_RISK_LABEL_BY_ID[normalizedId]) {
    return LIFESTYLE_RISK_LABEL_BY_ID[normalizedId];
  }

  const rawLabel = sanitizeTitle(toTrimmedText(input.label || input.id));
  const collapsed = rawLabel.replace(/\s+/g, "");
  const mapped = LIFESTYLE_RISK_BASE_LABEL_BY_NAME[collapsed] || rawLabel || "생활습관";
  const withoutSuffix = mapped.endsWith("위험도") ? mapped.slice(0, -3).trim() : mapped;
  return `${withoutSuffix} 위험도`;
}

function toRadarPointString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function normalizeSupplementHeadingText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldWrapLifestyleRiskLabel(input: { id: string; label: string }) {
  const normalizedId = input.id.trim().toLowerCase();
  const normalizedLabel = input.label.replace(/\s+/g, "");
  return (
    normalizedId.includes("activity") ||
    normalizedId.includes("immune") ||
    normalizedLabel.includes("활동량위험도") ||
    normalizedLabel.includes("면역관리위험도")
  );
}

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
  const sectionTitle = toTrimmedText(line.sectionTitle);
  const questionText = toTrimmedText(line.questionText);
  const prefixMatch = questionText.match(/^(.+?)\s*[·ㆍ•-]\s*(.+)$/u);

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
  return (
    ROUTINE_ROW_BASE_UNITS +
    estimateWrappedTextUnits(line, 32, 20)
  );
}

function estimateSectionAdviceRowUnits(line: SectionAdviceLine) {
  const recommendationWeightMultiplier = line.continuation ? 1.2 : 1;
  return (
    SECTION_ROW_BASE_UNITS +
    estimateWrappedTextUnits(line.questionText, 30, 19) +
    estimateWrappedTextUnits(line.answerText, 30, 17) +
    estimateWrappedTextUnits(line.recommendation, 30, 20) * recommendationWeightMultiplier
  );
}

function estimateSupplementRowUnits(row: SupplementRow) {
  const headingUnits = row.showSectionTitle ? 48 : 34;
  const continuationUnits = row.continuation ? 20 : 0;
  const paragraphUnits = row.paragraphs.reduce((sum, paragraph) => {
    return sum + estimateWrappedTextUnits(paragraph, 30, 21);
  }, 0);
  const nutrientCount = row.recommendedNutrients.length;
  const nutrientRows =
    nutrientCount > 0 ? Math.ceil(nutrientCount / SUPPLEMENT_NUTRIENTS_PER_ROW) : 0;
  const nutrientUnits = nutrientCount > 0 ? 62 + nutrientRows * 24 : 0;
  return (
    SUPPLEMENT_ROW_BASE_UNITS +
    headingUnits +
    continuationUnits +
    paragraphUnits +
    nutrientUnits +
    SUPPLEMENT_ROW_SAFETY_UNITS
  );
}

function createEmptySurveyDetailPage(): SurveyDetailPageModel {
  return {
    routineRows: [],
    sectionAdviceRows: [],
    supplementRows: [],
  };
}

function normalizeContinuationTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/\(\s*\uACC4\uC18D\s*\)$/u, "").trim();
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
  return lines.flatMap((line) =>
    splitLongTextForPagination(line, ROUTINE_ROW_CHUNK_MAX_CHARS)
  );
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
        title: isContinuation
          ? normalizeContinuationTitle(row.title || row.sectionTitle)
          : row.title,
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

function buildSurveyDetailPages(input: {
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
          ? new Set(
              currentPage.sectionAdviceRows.map((row) =>
                resolveSectionGroupKey(row)
              )
            )
          : null;
      const pickedSectionGroupKeys = new Set<string>();

      while (cursor + takeCount < segment.items.length) {
        const item = segment.items[cursor + takeCount];
        let additionalUnits = 0;
        if (segment.type === "section") {
          const groupKey = resolveSectionGroupKey(item as SectionAdviceLine);
          const hasExistingGroup =
            !!groupKey &&
            (existingSectionGroupKeys?.has(groupKey) ||
              pickedSectionGroupKeys.has(groupKey));
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
        const forcedAdditionalUnits =
          segment.type === "section" ? SECTION_GROUP_BASE_UNITS : 0;
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

  const wellness = payload.analysis?.wellness;
  const commonQuestionScores = wellness?.perQuestionScores?.common ?? {};
  const sectionScoreMaps = wellness?.perQuestionScores?.sections ?? {};

  const lifestyleAnsweredCount = Object.entries(commonQuestionScores).filter(
    ([questionId, score]) =>
      /^C(1[0-9]|2[0-6])$/.test(questionId) &&
      typeof score === "number" &&
      Number.isFinite(score)
  ).length;
  const sectionAnsweredCount = Object.values(sectionScoreMaps).reduce((sum, sectionMap) => {
    return (
      sum +
      Object.values(sectionMap ?? {}).filter(
        (score) => typeof score === "number" && Number.isFinite(score)
      ).length
    );
  }, 0);

  const hasWellnessScoringData = lifestyleAnsweredCount > 0 || sectionAnsweredCount > 0;

  const healthScore = hasWellnessScoringData
    ? toScoreValue(
        wellness?.overallHealthScore ?? payload.analysis?.summary?.overallScore ?? null
      )
    : null;
  const lifestyleOverall = hasWellnessScoringData
    ? toScoreValue(wellness?.lifestyleRisk?.overallPercent ?? null)
    : null;
  const healthNeedAverage = hasWellnessScoringData
    ? toScoreValue(wellness?.healthManagementNeed?.averagePercent ?? null)
    : null;

  const donutOffset =
    healthScore == null
      ? DONUT_CIRCUMFERENCE
      : DONUT_CIRCUMFERENCE * (1 - clampPercent(healthScore) / 100);

  const resolvedHealthScore = resolveHealthScoreLabel(healthScore);

  const lifestyleRiskAxes = ensureArray(wellness?.lifestyleRisk?.domains)
    .map((axis) => ({
      id: firstOrDash(axis?.id),
      label: toLifestyleRiskLabel({
        id: firstOrDash(axis?.id),
        label: firstOrDash(axis?.name || axis?.id),
      }),
      score: clampPercent(axis?.percent),
    }))
    .slice(0, 4);

  const resolvedLifestyleRiskAxes =
    lifestyleRiskAxes.length > 0
      ? lifestyleRiskAxes
      : [
          { id: "diet", label: "식습관 위험도", score: 0 },
          { id: "activity", label: "활동량 위험도", score: 0 },
          { id: "immune", label: "면역관리 위험도", score: 0 },
          { id: "sleep", label: "수면 위험도", score: 0 },
        ];

  const sectionNeeds = ensureArray(wellness?.healthManagementNeed?.sections)
    .map((section) => ({
      sectionId: firstOrDash(section?.sectionId),
      sectionTitle: sanitizeTitle(firstOrDash(section?.sectionTitle || section?.sectionId)),
      percent: clampPercent(section?.percent),
    }))
    .sort((left, right) => {
      if (right.percent !== left.percent) return right.percent - left.percent;
      return left.sectionId.localeCompare(right.sectionId);
    });
  const sectionTitleById = new Map(
    sectionNeeds
      .filter((row) => row.sectionId.length > 0 && row.sectionId !== "-")
      .map((row) => [row.sectionId, row.sectionTitle] as const)
  );

  const sectionNeedsForPage1 = sectionNeeds.slice(0, MAX_PAGE1_SECTION_BARS);
  const hiddenSectionNeedCount = Math.max(0, sectionNeeds.length - sectionNeedsForPage1.length);

  const detailedSectionAdviceLines = buildDetailedSectionAdviceLines(
    payload,
    Number.POSITIVE_INFINITY
  );
  const hasSectionAdviceContent = detailedSectionAdviceLines.length > 0;
  const lifestyleRoutineAdviceLines = ensureArray(wellness?.lifestyleRoutineAdvice)
    .map((item) => ensureSentence(toTrimmedText(item)))
    .filter(Boolean);
  const supplementDesignRows = ensureArray(wellness?.supplementDesign).map((item) => {
    const sectionId = firstOrDash(item?.sectionId);
    const sectionTitle = sectionTitleById.get(sectionId) || sanitizeTitle(sectionId);
    const title = sanitizeTitle(firstOrDash(item?.title));
    const showSectionTitle =
      normalizeSupplementHeadingText(sectionTitle) !== normalizeSupplementHeadingText(title);
    return {
      sectionId,
      sectionTitle,
      title,
      showSectionTitle,
      paragraphs: ensureArray(item?.paragraphs)
        .map((paragraph) => ensureSentence(toTrimmedText(paragraph)))
        .filter(Boolean),
      recommendedNutrients: ensureArray(item?.recommendedNutrients)
        .map((nutrient) => sanitizeTitle(firstOrDash(nutrient?.labelKo || nutrient?.label)))
        .filter(Boolean),
    };
  });

  const surveyPages = buildSurveyDetailPages({
    routineLines: lifestyleRoutineAdviceLines,
    sectionAdviceLines: detailedSectionAdviceLines,
    supplementRows: supplementDesignRows,
  });
  const firstPageSurveyDetails = surveyPages[0] ?? createEmptySurveyDetailPage();
  const continuationSurveyPages = surveyPages.slice(1);
  const hasFirstPageSurveyContent = hasSurveyDetailPageContent(firstPageSurveyDetails);
  const surveyDetailPageStart = 2;
  const healthDataPageNumber = surveyDetailPageStart + continuationSurveyPages.length;
  const medicationPageNumber = healthDataPageNumber + 1;

  const radarCenterX = 120;
  const radarCenterY = 106;
  const radarRadius = 52;
  const radarAxes = resolvedLifestyleRiskAxes.map((axis, index, axisList) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisList.length;
    const outerX = radarCenterX + radarRadius * Math.cos(angle);
    const outerY = radarCenterY + radarRadius * Math.sin(angle);
    const valueRatio = clampPercent(axis.score) / 100;
    const valueX = radarCenterX + radarRadius * valueRatio * Math.cos(angle);
    const valueY = radarCenterY + radarRadius * valueRatio * Math.sin(angle);
    const labelRadius = radarRadius + 22;
    const rawLabelX = radarCenterX + labelRadius * Math.cos(angle);
    const rawLabelY = radarCenterY + labelRadius * Math.sin(angle);
    const labelX = Math.max(16, Math.min(224, rawLabelX));
    const labelY = Math.max(20, Math.min(186, rawLabelY));
    const labelAnchor: "start" | "middle" | "end" =
      rawLabelX < radarCenterX - 30
        ? "end"
        : rawLabelX > radarCenterX + 30
          ? "start"
          : "middle";
    const isWrappedRiskLabel = shouldWrapLifestyleRiskLabel({
      id: axis.id,
      label: axis.label,
    });
    const labelBaseText = isWrappedRiskLabel
      ? axis.label.replace(/\s*위험도$/u, "").trim()
      : axis.label;
    const labelLines =
      isWrappedRiskLabel && labelBaseText.length > 0 ? [labelBaseText, "위험도"] : [axis.label];
    return {
      ...axis,
      outerX,
      outerY,
      valueX,
      valueY,
      labelX,
      labelY,
      labelAnchor,
      labelLines,
      scoreText: toScoreLabel(axis.score),
    };
  });
  const radarLevels = [0.25, 0.5, 0.75, 1];
  const radarAreaPoints = toRadarPointString(
    radarAxes.map((axis) => ({ x: axis.valueX, y: axis.valueY }))
  );

  const coreMetricStatusByLabel = new Map(
    ensureArray(payload.health?.coreMetrics)
      .map((row) => ({
        label: sanitizeTitle(firstOrDash(row?.label)),
        statusLabel: resolveMetricStatusLabel(row?.status),
      }))
      .filter((row) => row.label.length > 0)
      .map((row) => [row.label, row.statusLabel] as const)
  );
  const rawHealthMetrics = ensureArray(payload.health?.metrics);
  const healthMetrics =
    rawHealthMetrics.length > 0
      ? rawHealthMetrics.map((row) => {
          const label = sanitizeTitle(firstOrDash(row?.metric));
          return {
            label,
            value: formatMetricValue(row?.value, row?.unit),
            statusLabel: coreMetricStatusByLabel.get(label) ?? "참고",
          };
        })
      : ensureArray(payload.health?.coreMetrics).map((row) => ({
          label: sanitizeTitle(firstOrDash(row?.label)),
          value: formatMetricValue(row?.value, row?.unit),
          statusLabel: resolveMetricStatusLabel(row?.status),
        }));

  const healthInsightEmptyMessage = "내용이 없습니다.";

  const medicationsAll = ensureArray(payload.health?.medications)
    .map((row) => ({
      medicationName: sanitizeTitle(firstOrDash(row?.medicationName)),
      hospitalName: sanitizeTitle(toTrimmedText(row?.hospitalName)),
      date: toMedicationMetaDate(row?.date),
    }));
  const medications = medicationsAll;

  const medicationStatusMessage = toTrimmedText(payload.health?.medicationStatus?.message);

  const pharmacistSummary = softenAdviceTone(toTrimmedText(payload.pharmacist?.summary));
  const pharmacistRecommendations = softenAdviceTone(
    toTrimmedText(payload.pharmacist?.recommendations)
  );
  const pharmacistCautions = softenAdviceTone(toTrimmedText(payload.pharmacist?.cautions));

  return (
    <div className={styles.reportDocument} data-report-document="1">
      <section className={`${styles.reportSheet} ${styles.reportSheetFirst}`} data-report-page="1">
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>WellnessBox 개인 건강 리포트</p>
          <h2 className={styles.reportPageTitle}>이번 달 건강 상태 요약과 우선 실천 항목</h2>
          <p className={styles.reportPageSubtitle}>
            먼저 전체 점수를 확인하고, 지금 바로 시작할 수 있는 실천 항목을 간단히 정리했습니다.
          </p>
          <div className={styles.reportMetaRow}>
            <span className={styles.reportMetaItem}>대상자: {firstOrDash(payload.meta?.employeeName)}</span>
            <span className={styles.reportMetaItem}>기간: {firstOrDash(payload.meta?.periodKey)}</span>
            <span className={styles.reportMetaItem}>생성: {formatDate(payload.meta?.generatedAt)}</span>
          </div>
        </header>

        <section className={styles.reportTopGrid}>
          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>건강점수</h3>
            </div>
            <div className={styles.reportScoreStack}>
              <div className={styles.donutWrap}>
                <svg
                  viewBox="0 0 140 140"
                  className={styles.donutSvg}
                  role="img"
                  aria-label="건강점수 원형 차트"
                >
                  <circle cx="70" cy="70" r={DONUT_RADIUS} className={styles.donutTrack} />
                  <circle
                    cx="70"
                    cy="70"
                    r={DONUT_RADIUS}
                    className={styles.donutProgress}
                    style={{
                      strokeDasharray: DONUT_CIRCUMFERENCE,
                      strokeDashoffset: donutOffset,
                    }}
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <strong>
                    <span className={styles.scoreValue}>{resolvedHealthScore.valueText}</span>
                    {resolvedHealthScore.unitText ? (
                      <span className={styles.scoreUnit}>{resolvedHealthScore.unitText}</span>
                    ) : null}
                  </strong>
                </div>
              </div>
              <p className={styles.reportFormula}>
                건강점수 = 100 - ((생활습관 위험도 + 건강관리 위험도 평균) / 2)
              </p>
            </div>
          </article>

          <article className={styles.reportTopCard}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>생활습관 위험도</h3>
            </div>
            <div className={styles.radarWrap}>
              <svg
                viewBox="0 0 240 210"
                className={styles.radarSvg}
                role="img"
                aria-label="생활습관 위험도 다이아몬드 그래프"
              >
                {radarLevels.map((level) => {
                  const levelPoints = toRadarPointString(
                    radarAxes.map((axis) => ({
                      x: radarCenterX + (axis.outerX - radarCenterX) * level,
                      y: radarCenterY + (axis.outerY - radarCenterY) * level,
                    }))
                  );
                  return (
                    <polygon
                      key={`radar-level-${level}`}
                      className={styles.radarGrid}
                      points={levelPoints}
                    />
                  );
                })}
                {radarAxes.map((axis) => (
                  <line
                    key={`radar-axis-${axis.id}`}
                    className={styles.radarAxis}
                    x1={radarCenterX}
                    y1={radarCenterY}
                    x2={axis.outerX}
                    y2={axis.outerY}
                  />
                ))}
                <polygon className={styles.radarArea} points={radarAreaPoints} />
                {radarAxes.map((axis) => (
                  <circle
                    key={`radar-point-${axis.id}`}
                    className={styles.radarPoint}
                    cx={axis.valueX}
                    cy={axis.valueY}
                    r={3}
                  />
                ))}
                {radarAxes.map((axis) => (
                  <text
                    key={`radar-label-${axis.id}`}
                    className={styles.radarLabel}
                    x={axis.labelX}
                    y={axis.labelY}
                    textAnchor={axis.labelAnchor}
                    dominantBaseline="central"
                  >
                    {axis.labelLines.map((labelLine, lineIndex) => (
                      <tspan
                        key={`radar-label-line-${axis.id}-${lineIndex}`}
                        x={axis.labelX}
                        dy={lineIndex === 0 ? "-0.35em" : "1.1em"}
                      >
                        {labelLine}
                      </tspan>
                    ))}
                    <tspan x={axis.labelX} dy="1.15em" className={styles.radarScoreLabel}>
                      {axis.scoreText}
                    </tspan>
                  </text>
                ))}
              </svg>
            </div>
            <p className={styles.inlineHint}>
              종합 위험도:{" "}
              <span className={styles.riskScoreText}>{toScoreLabel(lifestyleOverall)}</span>
            </p>
          </article>

          <article className={`${styles.reportTopCard} ${styles.reportTopCardNeed}`}>
            <div className={styles.reportTopHead}>
              <h3 className={styles.sectionTitle}>건강관리 위험도</h3>
            </div>
            <div
              className={styles.needCardContent}
            >
              {sectionNeedsForPage1.length === 0 ? (
                <p className={styles.inlineHint}>선택 영역 데이터가 없습니다.</p>
              ) : (
                <ul className={styles.needList}>
                  {sectionNeedsForPage1.map((section) => (
                    <li key={`need-${section.sectionId}`} className={styles.needRow}>
                      <div className={styles.needHead}>
                        <span>{section.sectionTitle}</span>
                        <strong>{toScoreLabel(section.percent)}</strong>
                      </div>
                      <div className={styles.needTrack}>
                        <div
                          className={styles.needFill}
                          style={{ width: `${clampPercent(section.percent)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.inlineHint}>
                평균 위험도:{" "}
                <span className={styles.riskScoreText}>{toScoreLabel(healthNeedAverage)}</span>
              </p>
              {hiddenSectionNeedCount > 0 ? (
                <p className={styles.inlineHint}>추가 영역 {hiddenSectionNeedCount}개는 뒤 페이지에서 확인 가능</p>
              ) : null}
            </div>
          </article>
        </section>

        {hasFirstPageSurveyContent ? (
          <SurveyDetailCards
            page={firstPageSurveyDetails}
            pageNumber={1}
            showSectionAdviceEmpty={!hasSectionAdviceContent}
          />
        ) : null}

      </section>

      <SurveyDetailPages
        surveyDetailPageStart={surveyDetailPageStart}
        surveyPages={continuationSurveyPages}
        showSectionAdviceEmptyOnFirstPage={!hasSectionAdviceContent && !hasFirstPageSurveyContent}
      />

      <section
        className={`${styles.reportSheet} ${styles.reportSheetSecond}`}
        data-report-page={String(healthDataPageNumber)}
      >
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>{`${healthDataPageNumber}페이지 상세 데이터`}</p>
          <h2 className={styles.reportPageTitle}>건강검진 데이터 상세</h2>
          <p className={styles.reportPageSubtitle}>
            건강검진에서 측정된 지표를 모두 확인하고 현재 상태를 점검합니다.
          </p>
        </header>

        <div className={styles.reportSecondStack}>
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>건강검진 전체 수치</h3>
            </div>
            {healthMetrics.length === 0 ? (
              <p className={styles.reportDataEmpty}>확인 가능한 건강검진 핵심 수치가 없습니다.</p>
            ) : (
              <ul className={styles.reportMetricGrid}>
                {healthMetrics.map((metric, index) => (
                  <li key={`metric-${index}`} className={styles.reportMetricItem}>
                    <div className={styles.reportMetricHead}>
                      <span className={styles.reportMetricLabel}>{metric.label}</span>
                      <span className={styles.reportInsightBadge}>{metric.statusLabel}</span>
                    </div>
                    <span className={styles.reportMetricValue}>{metric.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.reportDataCard}>
            <h3 className={styles.reportDataTitle}>건강검진 데이터 해석</h3>
            <p className={styles.reportDataEmpty}>{healthInsightEmptyMessage}</p>
          </article>
        </div>
      </section>

      <section
        className={`${styles.reportSheet} ${styles.reportSheetThird}`}
        data-report-page={String(medicationPageNumber)}
      >
        <header className={styles.reportPageHeader}>
          <p className={styles.reportPageKicker}>{`${medicationPageNumber}페이지 상세 데이터`}</p>
          <h2 className={styles.reportPageTitle}>복약 이력 · 약사 코멘트</h2>
          <p className={styles.reportPageSubtitle}>
            복약 이력을 기준으로 언제 어떤 약물을 처방·조제받았는지 확인합니다.
          </p>
        </header>

        <div className={styles.reportSecondStack}>
          <article className={styles.reportDataCard}>
            <div className={styles.reportDataHeadRow}>
              <h3 className={styles.reportDataTitle}>복약 이력 상세</h3>
            </div>
            {medicationStatusMessage ? (
              <p className={styles.reportBlockLead}>{ensureSentence(medicationStatusMessage)}</p>
            ) : null}
            {medications.length === 0 ? (
              <p className={styles.reportDataEmpty}>복약 이력이 없습니다.</p>
            ) : (
              <ul className={styles.reportMedicationList}>
                {medications.map((medication, index) => (
                  <li key={`medication-${index}`} className={styles.reportMedicationItem}>
                    <p className={styles.reportMedicationName}>{medication.medicationName}</p>
                    <p className={styles.reportMedicationMeta}>
                      {buildMedicationMetaLine({
                        date: medication.date,
                        hospitalName: medication.hospitalName,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.reportDataCard}>
            <h3 className={styles.reportDataTitle}>약사 코멘트</h3>
            {pharmacistSummary ? (
              <p className={styles.reportBlockLead}>{pharmacistSummary}</p>
            ) : (
              <p className={styles.reportDataEmpty}>등록된 약사 코멘트가 없습니다.</p>
            )}
            {pharmacistRecommendations ? (
              <p className={styles.reportDataBody}>
                <strong>권장사항:</strong> {pharmacistRecommendations}
              </p>
            ) : null}
            {pharmacistCautions ? (
              <p className={styles.reportDataBody}>
                <strong>주의사항:</strong> {pharmacistCautions}
              </p>
            ) : null}
          </article>
        </div>

        <section className={styles.metaFooter}>
          {viewerMode === "admin" ? (
            <>
              생성 시각: {formatDate(payload.meta?.generatedAt)} / 대상자:{" "}
              {firstOrDash(payload.meta?.employeeName)} / 기간:{" "}
              {firstOrDash(payload.meta?.periodKey)}
              {payload.meta?.isMockData ? " / 데모 데이터" : ""}
            </>
          ) : (
            <>
              대상자: {firstOrDash(payload.meta?.employeeName)} / 기간:{" "}
              {firstOrDash(payload.meta?.periodKey)}
            </>
          )}
        </section>
      </section>

    </div>
  );
}
