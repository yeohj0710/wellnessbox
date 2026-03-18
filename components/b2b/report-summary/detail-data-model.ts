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

const ADDENDUM_SUMMARY_ONLY_THRESHOLD = 280;
const ADDENDUM_SUMMARY_SINGLE_PRODUCT_THRESHOLD = 160;
const ADDENDUM_PRODUCTS_PER_PAGE = 2;

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
  let remainingProducts = [...addendum.packagedProducts];

  if (addendum.consultationSummary.length > 0) {
    const firstPageProductCapacity =
      addendum.consultationSummary.length >= ADDENDUM_SUMMARY_ONLY_THRESHOLD
        ? 0
        : addendum.consultationSummary.length >= ADDENDUM_SUMMARY_SINGLE_PRODUCT_THRESHOLD
          ? 1
          : ADDENDUM_PRODUCTS_PER_PAGE;

    pages.push({
      consultationSummary: addendum.consultationSummary,
      packagedProducts: remainingProducts.slice(0, firstPageProductCapacity),
    });
    remainingProducts = remainingProducts.slice(firstPageProductCapacity);
  }

  const productChunks = chunkPackagedProducts(
    remainingProducts,
    ADDENDUM_PRODUCTS_PER_PAGE
  );

  if (pages.length === 0 && productChunks.length === 0) {
    pages.push({
      consultationSummary: addendum.consultationSummary,
      packagedProducts: [],
    });
  }

  for (const chunk of productChunks) {
    pages.push({
      consultationSummary: "",
      packagedProducts: chunk,
    });
  }

  return pages.filter(
    (page) =>
      page.consultationSummary.length > 0 || page.packagedProducts.length > 0
  );
}
