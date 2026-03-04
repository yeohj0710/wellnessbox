import "server-only";

import type {
  HyphenApiResponse,
  HyphenNhisRequestPayload,
} from "@/lib/server/hyphen/client";
import {
  fetchCheckupOverview,
  fetchCheckupResultList,
  fetchCheckupYearlyResult,
  fetchHealthAge,
  fetchMedicalInfo,
  fetchMedicationInfo,
} from "@/lib/server/hyphen/client";
import {
  MAX_CHECKUP_YEARLY_REQUESTS_PER_FETCH,
  type NhisFetchFailedItem,
  type NhisFetchRoutePayload,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import {
  collectDetailKeyPairs,
  mergeListPayloads,
  normalizeYearLimit,
  parseYears,
  type DetailKeyPair,
  type RequestDefaultsLike,
} from "@/lib/server/hyphen/fetch-executor.helpers";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";
import { normalizeNhisPayload } from "@/lib/server/hyphen/normalize";
import {
  getErrorCodeMessage,
  logHyphenError,
} from "@/lib/server/hyphen/route-utils";

type ExecuteNhisFetchInput = {
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  basePayload: HyphenNhisRequestPayload;
  detailPayload: HyphenNhisRequestPayload;
  requestDefaults: RequestDefaultsLike;
};

export type ExecuteNhisFetchOutput = {
  payload: NhisFetchRoutePayload;
  firstFailed?: NhisFetchFailedItem;
};

const NO_DATA_ERR_CODES = new Set([
  "C0009-001", // 건강나이 미제공/비대상
  "NO_DATA",
  "NO-DATA",
]);

const FATAL_AUTH_ERR_CODES = new Set([
  "LOGIN-999",
  "C0012-001",
]);

const NO_DATA_MESSAGE_PATTERN =
  /(조회\s*결과|조회결과|데이터(?:\s*내역)?|진료\s*내역|복약\s*내역|기록).*(없|없음)|no\s*data|no\s*records?/i;

const AUTH_OR_PRECONDITION_MESSAGE_PATTERN =
  /(세션|만료|로그인|인증|token|auth|healthin|권한|초기화|step)/i;

const HARD_FAILURE_MESSAGE_PATTERN =
  /(불러오지\s*못|불러올\s*수\s*없|연동\s*실패|실패|오류|error|exception|timeout|forbidden|denied|not\s*allowed|unable\s*to)/i;
const MEDICATION_RECENT_VISIT_BACKFILL_LIMIT = 3;
const MEDICATION_NAME_KEYS = [
  "medicineNm",
  "medicine",
  "drugName",
  "drugNm",
  "medNm",
  "medicineName",
  "prodName",
  "drug_MEDI_PRDC_NM",
  "MEDI_PRDC_NM",
  "drug_CMPN_NM",
  "detail_CMPN_NM",
  "CMPN_NM",
  "drug_CMPN_NM_2",
  "detail_CMPN_NM_2",
  "CMPN_NM_2",
  "mediPrdcNm",
  "drugMediPrdcNm",
  "cmpnNm",
  "drugCmpnNm",
  "detailCmpnNm",
  "cmpnNm2",
  "drugCmpnNm2",
  "detailCmpnNm2",
  "복용약",
  "약품명",
  "약품",
  "성분",
] as const;
const MEDICATION_DATE_KEYS = [
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

function getErrorBody(error: unknown): unknown | null {
  if (!error || typeof error !== "object") return null;
  const candidate = (error as { body?: unknown }).body;
  return candidate ?? null;
}

function emptyPayload(): HyphenApiResponse {
  return { data: {} };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolvePayloadData(payload: HyphenApiResponse) {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data);
  return data ?? root;
}

function payloadHasAnyRows(payload: HyphenApiResponse) {
  const data = resolvePayloadData(payload);
  if (Array.isArray(data.list) && data.list.length > 0) return true;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) return true;
  }
  return false;
}

function toNonEmptyText(value: unknown): string | null {
  if (value == null) return null;
  const rendered = String(value).trim();
  return rendered.length > 0 ? rendered : null;
}

function isMeaningfulMedicationName(value: unknown) {
  const text = toNonEmptyText(value);
  if (!text) return false;
  if (text === "-" || text === "없음") return false;
  return true;
}

function resolveMedicationDateText(row: Record<string, unknown>) {
  for (const key of MEDICATION_DATE_KEYS) {
    const text = toNonEmptyText(row[key]);
    if (text) return text;
  }
  return null;
}

function normalizeMedicationDateToYmd(text: string | null) {
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(0, 8);
}

function resolveMedicationDateScore(text: string | null) {
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

function collectTreatmentRows(payload: HyphenApiResponse) {
  const treatment = normalizeTreatmentPayload(payload);
  return Array.isArray(treatment.list)
    ? (treatment.list as Array<Record<string, unknown>>)
    : [];
}

function payloadHasMedicationNames(payload: HyphenApiResponse) {
  const rows = collectTreatmentRows(payload);
  for (const row of rows) {
    for (const key of MEDICATION_NAME_KEYS) {
      if (isMeaningfulMedicationName(row[key])) {
        return true;
      }
    }
  }
  return false;
}

function collectRecentMedicalVisitDates(payload: HyphenApiResponse, limit: number) {
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

function buildExactDateMedicationPayload(
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

function buildMonthRangeMedicationPayload(
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

function mergeHyphenPayloadList(payloads: HyphenApiResponse[]) {
  if (payloads.length === 0) return null;
  if (payloads.length === 1) return payloads[0] ?? null;
  return mergeListPayloads(payloads);
}

async function fetchMedicationBackfillPayloads(input: {
  dates: string[];
  detailPayload: HyphenNhisRequestPayload;
  payloadBuilder: (
    base: HyphenNhisRequestPayload,
    date: string
  ) => HyphenNhisRequestPayload;
}) {
  if (input.dates.length === 0) return [];
  const settled = await Promise.allSettled(
    input.dates.map((date) =>
      fetchMedicationInfo(input.payloadBuilder(input.detailPayload, date))
    )
  );
  const payloads: HyphenApiResponse[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      if (payloadHasAnyRows(result.value)) {
        payloads.push(result.value);
      }
      continue;
    }
    if (isNonFatalNhisNoDataFailure(result.reason)) continue;
    logHyphenError("[hyphen][fetch] recent-medication backfill failed", result.reason);
  }
  return payloads;
}

async function fetchMedicationByRecentVisitsBackfill(input: {
  dateSourcePayloads: Array<HyphenApiResponse | null | undefined>;
  detailPayload: HyphenNhisRequestPayload;
}) {
  const recentDates: string[] = [];
  const seen = new Set<string>();
  for (const payload of input.dateSourcePayloads) {
    if (!payload) continue;
    const dates = collectRecentMedicalVisitDates(
      payload,
      MEDICATION_RECENT_VISIT_BACKFILL_LIMIT
    );
    for (const date of dates) {
      if (seen.has(date)) continue;
      seen.add(date);
      recentDates.push(date);
      if (recentDates.length >= MEDICATION_RECENT_VISIT_BACKFILL_LIMIT) break;
    }
    if (recentDates.length >= MEDICATION_RECENT_VISIT_BACKFILL_LIMIT) break;
  }
  if (recentDates.length === 0) return null;

  const exactPayloads = await fetchMedicationBackfillPayloads({
    dates: recentDates,
    detailPayload: input.detailPayload,
    payloadBuilder: buildExactDateMedicationPayload,
  });
  const exactMerged = mergeHyphenPayloadList(exactPayloads);
  if (exactMerged && payloadHasMedicationNames(exactMerged)) {
    return exactMerged;
  }

  const monthProbeDates = [...new Set(recentDates.map((date) => date.slice(0, 6)))].map(
    (yyyymm) => `${yyyymm}01`
  );
  const monthPayloads = await fetchMedicationBackfillPayloads({
    dates: monthProbeDates,
    detailPayload: input.detailPayload,
    payloadBuilder: buildMonthRangeMedicationPayload,
  });

  const merged = mergeHyphenPayloadList([...exactPayloads, ...monthPayloads]);
  return merged ?? null;
}

function normalizeErrCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

export function isNonFatalNhisNoDataFailure(reason: unknown) {
  const errorInfo = getErrorCodeMessage(reason);
  const errCode = normalizeErrCode(errorInfo.code);
  const errMessage = (errorInfo.message || "").trim();
  if (!errCode && !errMessage) return false;

  if (FATAL_AUTH_ERR_CODES.has(errCode)) return false;
  if (NO_DATA_ERR_CODES.has(errCode)) return true;

  if (!errMessage) return false;
  if (AUTH_OR_PRECONDITION_MESSAGE_PATTERN.test(errMessage)) return false;
  if (HARD_FAILURE_MESSAGE_PATTERN.test(errMessage)) return false;
  return NO_DATA_MESSAGE_PATTERN.test(errMessage);
}

type FetchSuccessMap = Map<NhisFetchTarget, unknown>;
type FetchRawFailureMap = Map<NhisFetchTarget, unknown>;

function getTargetPayload<T>(
  successful: FetchSuccessMap,
  target: NhisFetchTarget
): T | undefined {
  return successful.get(target) as T | undefined;
}

function buildSuccessfulFetchPayload(input: {
  successful: FetchSuccessMap;
  rawFailures: FetchRawFailureMap;
  failed: NhisFetchFailedItem[];
  checkupListRawByYear: Record<string, unknown>;
}): NhisFetchRoutePayload {
  const checkupListPayload =
    getTargetPayload<HyphenApiResponse[]>(input.successful, "checkupList") ?? [];
  const checkupYearlyPayload =
    getTargetPayload<HyphenApiResponse[]>(input.successful, "checkupYearly") ??
    [];
  const medicalPayload =
    getTargetPayload<HyphenApiResponse>(input.successful, "medical") ??
    emptyPayload();
  const medicationPayload =
    getTargetPayload<HyphenApiResponse>(input.successful, "medication") ??
    emptyPayload();
  const checkupOverviewPayload =
    getTargetPayload<HyphenApiResponse>(input.successful, "checkupOverview") ??
    emptyPayload();
  const healthAgePayload =
    getTargetPayload<HyphenApiResponse>(input.successful, "healthAge") ??
    emptyPayload();

  const normalized = normalizeNhisPayload({
    medical: medicalPayload,
    medication: medicationPayload,
    checkupList: checkupListPayload,
    checkupYearly: checkupYearlyPayload,
    checkupOverview: checkupOverviewPayload,
    healthAge: healthAgePayload,
  });

  return {
    ok: true,
    partial: input.failed.length > 0,
    failed: input.failed,
    data: {
      normalized,
      raw: {
        medical:
          input.successful.get("medical") ?? input.rawFailures.get("medical") ?? null,
        medication:
          input.successful.get("medication") ??
          input.rawFailures.get("medication") ??
          null,
        checkupList:
          (checkupListPayload.length > 0
            ? mergeListPayloads(checkupListPayload)
            : input.rawFailures.get("checkupList")) ?? null,
        checkupYearly:
          (checkupYearlyPayload.length > 0
            ? checkupYearlyPayload
            : input.rawFailures.get("checkupYearly")) ?? null,
        checkupOverview:
          input.successful.get("checkupOverview") ??
          input.rawFailures.get("checkupOverview") ??
          null,
        healthAge:
          input.successful.get("healthAge") ??
          input.rawFailures.get("healthAge") ??
          null,
        checkupListByYear: input.checkupListRawByYear,
      },
    },
  };
}

export async function executeNhisFetch(
  input: ExecuteNhisFetchInput
): Promise<ExecuteNhisFetchOutput> {
  const effectiveYearLimit = normalizeYearLimit(input.effectiveYearLimit);
  const successful = new Map<NhisFetchTarget, unknown>();
  const failed: NhisFetchFailedItem[] = [];
  const rawFailures = new Map<NhisFetchTarget, unknown>();

  const markFailure = (
    target: NhisFetchTarget,
    reason: unknown,
    fallbackMessage?: string
  ) => {
    logHyphenError(`[hyphen][fetch] target=${target} failed`, reason);
    const errorInfo = getErrorCodeMessage(reason);
    const errorBody = getErrorBody(reason);
    if (errorBody !== null) {
      rawFailures.set(target, errorBody);
    }
    failed.push({
      target,
      errCd: errorInfo.code,
      errMsg: errorInfo.message || fallbackMessage,
    });
  };

  const independentJobs: Promise<void>[] = [];
  const runIndependentTarget = (
    target: NhisFetchTarget,
    runner: () => Promise<unknown>,
    fallbackMessage: string
  ) => {
    if (!input.targets.includes(target)) return;
    independentJobs.push(
      (async () => {
        try {
          const result = await runner();
          successful.set(target, result);
        } catch (error) {
          if (isNonFatalNhisNoDataFailure(error)) {
            successful.set(target, emptyPayload());
            return;
          }
          markFailure(target, error, fallbackMessage);
        }
      })()
    );
  };

  runIndependentTarget(
    "medical",
    () => fetchMedicalInfo(input.detailPayload),
    "진료 정보를 불러오지 못했습니다."
  );
  runIndependentTarget(
    "healthAge",
    () => fetchHealthAge(input.basePayload),
    "건강 나이 정보를 불러오지 못했습니다."
  );
  runIndependentTarget(
    "checkupOverview",
    () => fetchCheckupOverview(input.basePayload),
    "\uac80\uc9c4 \uc694\uc57d\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
  );
  runIndependentTarget(
    "medication",
    async () => {
      let detailPayloadResult: HyphenApiResponse | null = null;
      let detailPayloadError: unknown = null;
      try {
        detailPayloadResult = await fetchMedicationInfo(input.detailPayload);
        if (payloadHasAnyRows(detailPayloadResult)) {
          return detailPayloadResult;
        }
      } catch (detailError) {
        detailPayloadResult = null;
        detailPayloadError = detailError;
      }

      let basePayloadResult: HyphenApiResponse | null = null;
      let basePayloadError: unknown = null;
      try {
        basePayloadResult = await fetchMedicationInfo(input.basePayload);
        if (payloadHasAnyRows(basePayloadResult)) {
          return basePayloadResult;
        }
      } catch (baseError) {
        basePayloadResult = null;
        basePayloadError = baseError;
      }

      if (detailPayloadError && !basePayloadError && basePayloadResult) {
        return basePayloadResult;
      }
      if (basePayloadError && !detailPayloadError && detailPayloadResult) {
        return detailPayloadResult;
      }

      if (detailPayloadError) {
        throw detailPayloadError;
      }
      if (basePayloadError) {
        throw basePayloadError;
      }

      return detailPayloadResult ?? basePayloadResult ?? emptyPayload();
    },
    "\ud22c\uc57d \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
  );

  const shouldLoadCheckupList =
    input.targets.includes("checkupList") ||
    input.targets.includes("checkupYearly");
  let checkupListPayloads: HyphenApiResponse[] = [];
  let checkupListRawByYear: Record<string, unknown> = {};
  let checkupDetailKeyPairs: DetailKeyPair[] = [];

  if (shouldLoadCheckupList) {
    const years = parseYears(
      input.requestDefaults.fromDate,
      input.requestDefaults.toDate,
      effectiveYearLimit
    );
    const yearFailures: string[] = [];
    let yearNoDataCount = 0;
    checkupListRawByYear = {};
    const shouldSeekDetailKey = input.targets.includes("checkupYearly");

    for (const year of years) {
      try {
        const payload = await fetchCheckupResultList({
          ...input.basePayload,
          yyyy: year,
        });
        checkupListPayloads.push(payload);
        checkupListRawByYear[year] = payload;

        if (shouldSeekDetailKey) {
          const keyPairs = collectDetailKeyPairs(
            payload,
            MAX_CHECKUP_YEARLY_REQUESTS_PER_FETCH
          );
          if (keyPairs.length > 0) {
            checkupDetailKeyPairs = keyPairs.slice(
              0,
              MAX_CHECKUP_YEARLY_REQUESTS_PER_FETCH
            );
            break;
          }
        }
      } catch (reason) {
        if (isNonFatalNhisNoDataFailure(reason)) {
          yearNoDataCount += 1;
          continue;
        }
        const errorInfo = getErrorCodeMessage(reason);
        yearFailures.push(`${year}: ${errorInfo.message || "조회 실패"}`);
        const errorBody = getErrorBody(reason);
        if (errorBody !== null) {
          checkupListRawByYear[year] = errorBody;
        }
      }
    }

    if (checkupListPayloads.length > 0) {
      successful.set("checkupList", checkupListPayloads);
      if (yearFailures.length > 0) {
        failed.push({
          target: "checkupList",
          errMsg: `건강검진 목록 일부 조회에 실패했습니다. (${yearFailures
            .slice(0, 4)
            .join(", ")})`,
        });
      }
    } else if (yearNoDataCount > 0) {
      successful.set("checkupList", []);
    } else {
      failed.push({
        target: "checkupList",
        errMsg: "건강검진 목록을 불러오지 못했습니다.",
      });
      rawFailures.set("checkupList", checkupListRawByYear);
    }
  }

  if (input.targets.includes("checkupYearly")) {
    const yearlyPayloads: HyphenApiResponse[] = [];
    const yearlyRaw: unknown[] = [];
    const yearlyFailures: Array<{ errCd?: string; errMsg?: string }> = [];
    let yearlyNoDataCount = 0;

    const keyPairs =
      checkupDetailKeyPairs.length > 0
        ? checkupDetailKeyPairs
        : collectDetailKeyPairs(
            checkupListPayloads,
            MAX_CHECKUP_YEARLY_REQUESTS_PER_FETCH
          );

    if (keyPairs.length > 0) {
      const settled = await Promise.allSettled(
        keyPairs.map((pair) =>
          fetchCheckupYearlyResult({
            ...input.basePayload,
            detailKey: pair.detailKey,
            detailKey2: pair.detailKey2,
          })
        )
      );

      settled.forEach((result) => {
        if (result.status === "fulfilled") {
          yearlyPayloads.push(result.value);
          yearlyRaw.push(result.value);
          return;
        }
        const reason = result.reason;
        if (isNonFatalNhisNoDataFailure(reason)) {
          yearlyNoDataCount += 1;
          return;
        }
        const errorInfo = getErrorCodeMessage(reason);
        yearlyFailures.push({
          errCd: errorInfo.code,
          errMsg: errorInfo.message,
        });
        const bodyValue = getErrorBody(reason);
        if (bodyValue !== null) {
          yearlyRaw.push(bodyValue);
        }
      });
    }

    if (yearlyPayloads.length > 0) {
      successful.set("checkupYearly", yearlyPayloads);
    } else if (keyPairs.length === 0) {
      successful.set("checkupYearly", []);
    } else if (yearlyNoDataCount >= keyPairs.length) {
      successful.set("checkupYearly", []);
    } else {
      const firstFailure = yearlyFailures[0];
      failed.push({
        target: "checkupYearly",
        errCd: firstFailure?.errCd,
        errMsg: firstFailure?.errMsg || "검진 상세 데이터를 불러오지 못했습니다.",
      });
      rawFailures.set("checkupYearly", yearlyRaw);
    }
  }

  await Promise.all(independentJobs);

  if (input.targets.includes("medication")) {
    const medicationPayload = getTargetPayload<HyphenApiResponse>(
      successful,
      "medication"
    );
    const medicalPayload = getTargetPayload<HyphenApiResponse>(successful, "medical");
    const shouldBackfillMedicationNames =
      (!medicationPayload ||
        !payloadHasAnyRows(medicationPayload) ||
        !payloadHasMedicationNames(medicationPayload));

    if (shouldBackfillMedicationNames) {
      const dateSourcePayloads: Array<HyphenApiResponse | null | undefined> = [];
      if (medicationPayload && payloadHasAnyRows(medicationPayload)) {
        dateSourcePayloads.push(medicationPayload);
      }
      if (medicalPayload && payloadHasAnyRows(medicalPayload)) {
        dateSourcePayloads.push(medicalPayload);
      }

      if (dateSourcePayloads.length === 0) {
        try {
          const fetchedMedicalForMedicationBackfill = await fetchMedicalInfo(
            input.detailPayload
          );
          if (payloadHasAnyRows(fetchedMedicalForMedicationBackfill)) {
            dateSourcePayloads.push(fetchedMedicalForMedicationBackfill);
          }
        } catch (error) {
          if (!isNonFatalNhisNoDataFailure(error)) {
            logHyphenError(
              "[hyphen][fetch] medication backfill medical-source failed",
              error
            );
          }
        }
      }

      const backfilledMedicationPayload = await fetchMedicationByRecentVisitsBackfill({
        dateSourcePayloads,
        detailPayload: input.detailPayload,
      });

      if (backfilledMedicationPayload && payloadHasAnyRows(backfilledMedicationPayload)) {
        if (medicationPayload && payloadHasAnyRows(medicationPayload)) {
          successful.set(
            "medication",
            mergeListPayloads([medicationPayload, backfilledMedicationPayload])
          );
        } else {
          successful.set("medication", backfilledMedicationPayload);
        }
        rawFailures.delete("medication");
        for (let index = failed.length - 1; index >= 0; index -= 1) {
          if (failed[index]?.target === "medication") {
            failed.splice(index, 1);
          }
        }
      }
    }
  }

  if (successful.size === 0) {
    const firstFailure = failed[0];
    const payload: NhisFetchRoutePayload = {
      ok: false,
      error: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      errCd: firstFailure?.errCd,
      errMsg: firstFailure?.errMsg,
      failed,
    };
    return { payload, firstFailed: firstFailure };
  }

  const payload = buildSuccessfulFetchPayload({
    successful,
    rawFailures,
    failed,
    checkupListRawByYear,
  });

  return { payload, firstFailed: failed[0] };
}
