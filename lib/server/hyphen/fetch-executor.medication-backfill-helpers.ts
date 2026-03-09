import type {
  HyphenApiResponse,
  HyphenNhisRequestPayload,
} from "@/lib/server/hyphen/client";
import { fetchMedicationInfo } from "@/lib/server/hyphen/client";
import { mergeListPayloads } from "@/lib/server/hyphen/fetch-executor.helpers";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";

export function resolveMedicationDateText(row: Record<string, unknown>) {
  const medicationDateKeys = [
    "diagSdate",
    "diagDate",
    "medDate",
    "date",
    "TRTM_YMD",
    "PRSC_YMD",
    "detail_TRTM_YMD",
    "detail_PRSC_YMD",
    "drug_TRTM_YMD",
    "drug_PRSC_YMD",
  ] as const;

  for (const key of medicationDateKeys) {
    const value = row[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

export function normalizeMedicationDateToYmd(text: string | null) {
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(0, 8);
}

export function resolveMedicationDateScore(text: string | null) {
  if (!text) return 0;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 6) {
    const score = Number(`${digits.slice(0, 6)}01`);
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

export function collectTreatmentRows(payload: HyphenApiResponse) {
  const treatment = normalizeTreatmentPayload(payload);
  return Array.isArray(treatment.list)
    ? (treatment.list as Array<Record<string, unknown>>)
    : [];
}

export function payloadHasMedicationNames(input: {
  payload: HyphenApiResponse;
  medicationNameKeys: readonly string[];
  isMeaningfulMedicationName: (value: unknown) => boolean;
}) {
  const rows = collectTreatmentRows(input.payload);
  for (const row of rows) {
    for (const key of input.medicationNameKeys) {
      if (input.isMeaningfulMedicationName(row[key])) {
        return true;
      }
    }
  }
  return false;
}

export function collectRecentMedicalVisitDates(
  payload: HyphenApiResponse,
  limit: number
) {
  const rows = collectTreatmentRows(payload);
  const scored = rows
    .map((row, index) => {
      const date = normalizeMedicationDateToYmd(resolveMedicationDateText(row));
      return {
        date,
        score: resolveMedicationDateScore(date),
        index,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  const dates: string[] = [];
  const seen = new Set<string>();
  for (const item of scored) {
    if (!item.date || seen.has(item.date)) continue;
    seen.add(item.date);
    dates.push(item.date);
    if (dates.length >= limit) break;
  }
  return dates;
}

export function buildExactDateMedicationPayload(
  base: HyphenNhisRequestPayload,
  date: string
): HyphenNhisRequestPayload {
  return {
    ...base,
    fromDate: date,
    toDate: date,
  };
}

function resolveLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function buildMonthRangeMedicationPayload(
  base: HyphenNhisRequestPayload,
  date: string
): HyphenNhisRequestPayload {
  const ymd = normalizeMedicationDateToYmd(date);
  if (!ymd) return base;
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return base;
  }
  const fromDate = `${String(year).padStart(4, "0")}${String(month).padStart(
    2,
    "0"
  )}01`;
  const toDate = `${String(year).padStart(4, "0")}${String(month).padStart(
    2,
    "0"
  )}${String(resolveLastDayOfMonth(year, month)).padStart(2, "0")}`;
  return {
    ...base,
    fromDate,
    toDate,
  };
}

export function mergeHyphenPayloadList(payloads: HyphenApiResponse[]) {
  if (payloads.length === 0) return null;
  if (payloads.length === 1) return payloads[0] ?? null;
  return mergeListPayloads(payloads);
}

export async function fetchMedicationBackfillPayloads(input: {
  dates: string[];
  basePayload: HyphenNhisRequestPayload;
  detailPayload: HyphenNhisRequestPayload;
  payloadBuilder: (
    base: HyphenNhisRequestPayload,
    date: string
  ) => HyphenNhisRequestPayload;
  hasRows: (payload: HyphenApiResponse) => boolean;
  hasMedicationNames: (payload: HyphenApiResponse) => boolean;
  isNonFatalNoDataFailure: (reason: unknown) => boolean;
  logError: (reason: unknown) => void;
}) {
  if (input.dates.length === 0) return [];
  const settled = await Promise.allSettled(
    input.dates.map(async (date) => {
      const detailRequestPayload = input.payloadBuilder(input.detailPayload, date);
      const baseRequestPayload = input.payloadBuilder(input.basePayload, date);

      let detailResult: HyphenApiResponse | null = null;
      let detailError: unknown = null;
      try {
        detailResult = await fetchMedicationInfo(detailRequestPayload);
      } catch (error) {
        detailError = error;
      }

      const detailHasRows = detailResult ? input.hasRows(detailResult) : false;
      const detailHasNames = detailResult
        ? input.hasMedicationNames(detailResult)
        : false;

      let baseResult: HyphenApiResponse | null = null;
      let baseError: unknown = null;
      if (!detailHasNames) {
        try {
          baseResult = await fetchMedicationInfo(baseRequestPayload);
        } catch (error) {
          baseError = error;
        }
      }

      const baseHasRows = baseResult ? input.hasRows(baseResult) : false;
      const baseHasNames = baseResult ? input.hasMedicationNames(baseResult) : false;

      if (detailHasNames) return detailResult;
      if (baseHasNames) return baseResult;
      if (detailHasRows) return detailResult;
      if (baseHasRows) return baseResult;

      if (detailError && !input.isNonFatalNoDataFailure(detailError)) {
        throw detailError;
      }
      if (baseError && !input.isNonFatalNoDataFailure(baseError)) {
        throw baseError;
      }
      return null;
    })
  );
  const payloads: HyphenApiResponse[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      if (result.value && input.hasRows(result.value)) {
        payloads.push(result.value);
      }
      continue;
    }
    if (input.isNonFatalNoDataFailure(result.reason)) continue;
    input.logError(result.reason);
  }
  return payloads;
}
