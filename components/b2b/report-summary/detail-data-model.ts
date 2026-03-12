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
  pharmacistSummary: string;
  pharmacistRecommendations: string;
  pharmacistCautions: string;
  medications: ReportSummaryMedicationRow[];
};

const EMPTY_PHARMACIST_COMMENT_MESSAGES = new Set([
  "약사 코멘트가 아직 입력되지 않았습니다.",
  "등록된 약사 코멘트가 없습니다.",
  "등록된 요약 코멘트가 없습니다.",
  "등록된 권장안이 없습니다.",
  "등록된 주의사항이 없습니다.",
  "권장안이 없습니다.",
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

export function hasReportSummaryHealthMetricsContent(
  rows: ReportSummaryHealthMetricRow[]
) {
  return rows.some((row) => {
    const value = row.value.trim();
    return value.length > 0 && value !== "-";
  });
}

export function resolveReportSummaryFinalPharmacistComment(
  payload: ReportSummaryPayload
) {
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
    pharmacistSummary: softenAdviceTone(toTrimmedText(payload.pharmacist?.summary)),
    pharmacistRecommendations: softenAdviceTone(
      toTrimmedText(payload.pharmacist?.recommendations)
    ),
    pharmacistCautions: softenAdviceTone(toTrimmedText(payload.pharmacist?.cautions)),
  };
}
