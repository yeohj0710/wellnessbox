import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { ensureArray, firstOrDash } from "./helpers";
import {
  formatMetricValue,
  resolveMetricStatusLabel,
  sanitizeTitle,
  softenAdviceTone,
  toTrimmedText,
} from "./card-insights";

export type ReportSummaryHealthMetricRow = {
  label: string;
  value: string;
  statusLabel: string;
};

export type ReportSummaryMedicationRow = {
  medicationName: string;
  hospitalName: string;
  date: string;
};

export type ReportSummaryMedicationReviewModel = {
  medicationStatusMessage: string;
  medications: ReportSummaryMedicationRow[];
};

export type ReportSummaryPackagedProductCard = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  description: string;
  ingredientSummary: string;
  caution: string;
};

export type ReportSummaryAddendumModel = {
  consultationSummary: string;
  packagedProducts: ReportSummaryPackagedProductCard[];
};

export type ReportSummaryAddendumPageModel = {
  consultationSummary: string;
  packagedProducts: ReportSummaryPackagedProductCard[];
};

const ADDENDUM_FIRST_PAGE_CONTENT_UNITS = 940;
const ADDENDUM_CONTINUATION_PAGE_CONTENT_UNITS = 1040;
const ADDENDUM_SUMMARY_CARD_BASE_UNITS = 138;
const ADDENDUM_SUMMARY_LINE_CHARS = 30;
const ADDENDUM_SUMMARY_LINE_UNITS = 24;
const ADDENDUM_SUMMARY_PARAGRAPH_GAP_UNITS = 14;
const ADDENDUM_SUMMARY_CHUNK_MAX_CHARS = 280;
const ADDENDUM_PRODUCT_ARTICLE_BASE_UNITS = 124;
const ADDENDUM_PRODUCT_ROW_GAP_UNITS = 22;
const ADDENDUM_PRODUCT_COLUMNS = 2;
const ADDENDUM_PRODUCT_CARD_BASE_UNITS = 178;
const ADDENDUM_PRODUCT_NAME_LINE_CHARS = 15;
const ADDENDUM_PRODUCT_BODY_LINE_CHARS = 28;
const ADDENDUM_PRODUCT_NAME_LINE_UNITS = 18;
const ADDENDUM_PRODUCT_BODY_LINE_UNITS = 14;

const EMPTY_PHARMACIST_COMMENT_MESSAGES = new Set([
  "약사 코멘트가 아직 입력되지 않았습니다.",
  "등록된 약사 코멘트가 없습니다.",
  "등록된 요약 코멘트가 없습니다.",
  "등록된 권장사항이 없습니다.",
  "등록된 주의사항이 없습니다.",
  "권장사항이 없습니다.",
  "주의사항이 없습니다.",
]);

export function toMedicationMetaDate(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return text;
}

export function buildMedicationMetaLine(input: {
  date: string;
  hospitalName: string;
}) {
  const parts = [input.date, input.hospitalName].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

export function buildReportSummaryHealthMetrics(
  payload: ReportSummaryPayload
): ReportSummaryHealthMetricRow[] {
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
  if (rawHealthMetrics.length > 0) {
    return rawHealthMetrics.map((row) => {
      const label = sanitizeTitle(firstOrDash(row?.metric));
      return {
        label,
        value: formatMetricValue(row?.value, row?.unit),
        statusLabel: coreMetricStatusByLabel.get(label) ?? "참고",
      };
    });
  }

  return ensureArray(payload.health?.coreMetrics).map((row) => ({
    label: sanitizeTitle(firstOrDash(row?.label)),
    value: formatMetricValue(row?.value, row?.unit),
    statusLabel: resolveMetricStatusLabel(row?.status),
  }));
}

export function hasReportSummaryHealthMetricsContent(rows: ReportSummaryHealthMetricRow[]) {
  return rows.some((row) => {
    const value = row.value.trim();
    return value.length > 0 && value !== "-";
  });
}

export function resolveReportSummaryFinalPharmacistComment(payload: ReportSummaryPayload) {
  const note = toTrimmedText(payload.pharmacist?.note);
  if (note && !EMPTY_PHARMACIST_COMMENT_MESSAGES.has(note)) {
    return softenAdviceTone(note);
  }
  return "";
}

export function buildReportSummaryMedicationReviewModel(
  payload: ReportSummaryPayload
): ReportSummaryMedicationReviewModel {
  return {
    medicationStatusMessage: toTrimmedText(payload.health?.medicationStatus?.message),
    medications: ensureArray(payload.health?.medications).map((row) => ({
      medicationName: sanitizeTitle(firstOrDash(row?.medicationName)),
      hospitalName: sanitizeTitle(toTrimmedText(row?.hospitalName)),
      date: toMedicationMetaDate(row?.date),
    })),
  };
}

export function buildReportSummaryAddendumModel(
  payload: ReportSummaryPayload
): ReportSummaryAddendumModel {
  const consultationSummary =
    softenAdviceTone(toTrimmedText(payload.reportAddendum?.consultationSummary)) ||
    resolveReportSummaryFinalPharmacistComment(payload);

  const packagedProducts = ensureArray(payload.reportAddendum?.packagedProducts)
    .map((row, index) => {
      const name = sanitizeTitle(
        toTrimmedText(row?.name) ||
          toTrimmedText(row?.brand) ||
          `구성 상품 ${index + 1}`
      );
      const brand = sanitizeTitle(toTrimmedText(row?.brand));
      const imageUrl = toTrimmedText(row?.imageUrl);
      const description = softenAdviceTone(toTrimmedText(row?.description));
      const ingredientSummary = softenAdviceTone(toTrimmedText(row?.ingredientSummary));
      const caution = softenAdviceTone(toTrimmedText(row?.caution));

      const hasVisibleContent = [
        name,
        brand,
        imageUrl,
        description,
        ingredientSummary,
        caution,
      ].some(Boolean);

      if (!hasVisibleContent) return null;

      return {
        id: toTrimmedText(row?.id) || `packaged-product-${index + 1}`,
        name,
        brand,
        imageUrl,
        description,
        ingredientSummary,
        caution,
      };
    })
    .filter((item): item is ReportSummaryPackagedProductCard => Boolean(item));

  return {
    consultationSummary,
    packagedProducts,
  };
}

function chunkPackagedProducts(
  packagedProducts: ReportSummaryPackagedProductCard[],
  size: number
) {
  const chunks: ReportSummaryPackagedProductCard[][] = [];
  for (let index = 0; index < packagedProducts.length; index += size) {
    chunks.push(packagedProducts.slice(index, index + size));
  }
  return chunks;
}

function estimateTextUnits(text: string, charsPerLine: number, lineUnits: number) {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / Math.max(8, charsPerLine))) * lineUnits;
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

function buildAddendumSummaryParagraphs(summary: string) {
  return summary
    .split(/\n{2,}/)
    .flatMap((paragraph) =>
      splitLongTextForPagination(paragraph.trim(), ADDENDUM_SUMMARY_CHUNK_MAX_CHARS)
    )
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function estimateAddendumSummaryParagraphUnits(paragraph: string) {
  return estimateTextUnits(
    paragraph,
    ADDENDUM_SUMMARY_LINE_CHARS,
    ADDENDUM_SUMMARY_LINE_UNITS
  );
}

function estimateAddendumSummaryUnits(summary: string) {
  const paragraphs = buildAddendumSummaryParagraphs(summary);
  if (paragraphs.length === 0) return 0;

  return (
    ADDENDUM_SUMMARY_CARD_BASE_UNITS +
    paragraphs.reduce((sum, paragraph, index) => {
      return (
        sum +
        estimateAddendumSummaryParagraphUnits(paragraph) +
        (index > 0 ? ADDENDUM_SUMMARY_PARAGRAPH_GAP_UNITS : 0)
      );
    }, 0)
  );
}

function estimatePackagedProductCardUnits(product: ReportSummaryPackagedProductCard) {
  return (
    ADDENDUM_PRODUCT_CARD_BASE_UNITS +
    estimateTextUnits(
      product.name,
      ADDENDUM_PRODUCT_NAME_LINE_CHARS,
      ADDENDUM_PRODUCT_NAME_LINE_UNITS
    ) +
    estimateTextUnits(
      product.brand,
      ADDENDUM_PRODUCT_BODY_LINE_CHARS,
      ADDENDUM_PRODUCT_BODY_LINE_UNITS
    ) +
    estimateTextUnits(
      product.description,
      ADDENDUM_PRODUCT_BODY_LINE_CHARS,
      ADDENDUM_PRODUCT_BODY_LINE_UNITS
    ) +
    estimateTextUnits(
      product.ingredientSummary,
      ADDENDUM_PRODUCT_BODY_LINE_CHARS,
      ADDENDUM_PRODUCT_BODY_LINE_UNITS
    ) +
    estimateTextUnits(
      product.caution,
      ADDENDUM_PRODUCT_BODY_LINE_CHARS,
      ADDENDUM_PRODUCT_BODY_LINE_UNITS
    )
  );
}

function estimatePackagedProductGridUnits(
  packagedProducts: ReportSummaryPackagedProductCard[]
) {
  if (packagedProducts.length === 0) return 0;

  const rows = chunkPackagedProducts(packagedProducts, ADDENDUM_PRODUCT_COLUMNS);
  return (
    ADDENDUM_PRODUCT_ARTICLE_BASE_UNITS +
    rows.reduce((sum, row, rowIndex) => {
      const rowUnits = row.reduce((max, product) => {
        return Math.max(max, estimatePackagedProductCardUnits(product));
      }, 0);
      return sum + rowUnits + (rowIndex > 0 ? ADDENDUM_PRODUCT_ROW_GAP_UNITS : 0);
    }, 0)
  );
}

function takePackagedProductsWithinBudget(input: {
  packagedProducts: ReportSummaryPackagedProductCard[];
  pageBudget: number;
  reservedUnits: number;
}) {
  const { packagedProducts, pageBudget, reservedUnits } = input;
  if (packagedProducts.length === 0) return 0;

  let takenCount = 0;

  while (takenCount < packagedProducts.length) {
    const nextCount = Math.min(
      packagedProducts.length,
      takenCount + ADDENDUM_PRODUCT_COLUMNS
    );
    const nextUnits =
      reservedUnits +
      estimatePackagedProductGridUnits(packagedProducts.slice(0, nextCount));
    if (nextUnits > pageBudget) break;
    takenCount = nextCount;
  }

  return takenCount;
}

function takeConsultationSummaryWithinBudget(input: {
  consultationSummary: string;
  pageBudget: number;
  reservedUnits?: number;
}) {
  const paragraphs = buildAddendumSummaryParagraphs(input.consultationSummary);
  if (paragraphs.length === 0) {
    return {
      takenSummary: "",
      remainingSummary: "",
    };
  }

  const safeBudget = Math.max(ADDENDUM_SUMMARY_CARD_BASE_UNITS, input.pageBudget);
  const reservedUnits = Math.max(0, input.reservedUnits ?? 0);
  let usedUnits = ADDENDUM_SUMMARY_CARD_BASE_UNITS;
  let takenCount = 0;

  while (takenCount < paragraphs.length) {
    const nextUnits =
      usedUnits +
      estimateAddendumSummaryParagraphUnits(paragraphs[takenCount]) +
      (takenCount > 0 ? ADDENDUM_SUMMARY_PARAGRAPH_GAP_UNITS : 0);

    if (reservedUnits + nextUnits > safeBudget && takenCount > 0) break;
    usedUnits = nextUnits;
    takenCount += 1;

    if (reservedUnits + usedUnits >= safeBudget) break;
  }

  const safeTakenCount = Math.max(1, takenCount);
  return {
    takenSummary: paragraphs.slice(0, safeTakenCount).join("\n\n"),
    remainingSummary: paragraphs.slice(safeTakenCount).join("\n\n"),
  };
}

export function buildReportSummaryAddendumPages(
  payload: ReportSummaryPayload
): ReportSummaryAddendumPageModel[] {
  const addendum = buildReportSummaryAddendumModel(payload);
  if (
    addendum.consultationSummary.length === 0 &&
    addendum.packagedProducts.length === 0
  ) {
    return [];
  }

  const pages: ReportSummaryAddendumPageModel[] = [];
  let remainingSummary = addendum.consultationSummary;
  let remainingProducts = [...addendum.packagedProducts];
  let pageBudget = ADDENDUM_FIRST_PAGE_CONTENT_UNITS;

  while (remainingSummary.length > 0) {
    const { takenSummary, remainingSummary: nextSummary } = takeConsultationSummaryWithinBudget({
      consultationSummary: remainingSummary,
      pageBudget,
    });
    const summaryUnits = estimateAddendumSummaryUnits(takenSummary);
    const productCapacity =
      nextSummary.length === 0
        ? takePackagedProductsWithinBudget({
            packagedProducts: remainingProducts,
            pageBudget,
            reservedUnits: summaryUnits,
          })
        : 0;

    pages.push({
      consultationSummary: takenSummary,
      packagedProducts: remainingProducts.slice(0, productCapacity),
    });

    remainingSummary = nextSummary;
    remainingProducts = remainingProducts.slice(productCapacity);
    pageBudget = ADDENDUM_CONTINUATION_PAGE_CONTENT_UNITS;
  }

  while (remainingProducts.length > 0) {
    const takeCount = takePackagedProductsWithinBudget({
      packagedProducts: remainingProducts,
      pageBudget,
      reservedUnits: 0,
    });
    const safeTakeCount =
      takeCount > 0
        ? takeCount
        : Math.min(remainingProducts.length, ADDENDUM_PRODUCT_COLUMNS);

    pages.push({
      consultationSummary: "",
      packagedProducts: remainingProducts.slice(0, safeTakeCount),
    });
    remainingProducts = remainingProducts.slice(safeTakeCount);
    pageBudget = ADDENDUM_CONTINUATION_PAGE_CONTENT_UNITS;
  }

  if (pages.length === 0) {
    pages.push({
      consultationSummary: addendum.consultationSummary,
      packagedProducts: [],
    });
  }

  return pages.filter(
    (page) =>
      page.consultationSummary.length > 0 || page.packagedProducts.length > 0
  );
}
