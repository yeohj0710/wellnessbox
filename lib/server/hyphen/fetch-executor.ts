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
import { normalizeNhisPayload } from "@/lib/server/hyphen/normalize";
import {
  getErrorCodeMessage,
  logHyphenError,
} from "@/lib/server/hyphen/route-utils";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";

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

function normalizeErrCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

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
  "diagDate",
  "medDate",
  "date",
  "TRTM_YMD",
  "PRSC_YMD",
  "detail_TRTM_YMD",
  "detail_PRSC_YMD",
  "drug_TRTM_YMD",
  "drug_PRSC_YMD",
  "prescribedDate",
  "prescDate",
  "medicationDate",
  "diagSdate",
] as const;

const MEDICATION_BACKFILL_ROLLING_DAYS = 90;

function isValidYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{8}$/.test(value.trim());
}

function formatDateToYmd(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function parseYmdToDate(value: string): Date | null {
  if (!isValidYmd(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function clampYmd(value: string, minValue?: string, maxValue?: string) {
  let clamped = value;
  if (isValidYmd(minValue) && clamped < minValue) clamped = minValue;
  if (isValidYmd(maxValue) && clamped > maxValue) clamped = maxValue;
  return clamped;
}

function normalizeYmd(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 8) return null;
  const ymd = digits.slice(0, 8);
  return /^\d{8}$/.test(ymd) ? ymd : null;
}

type MedicationPayloadStats = {
  hasRows: boolean;
  hasNames: boolean;
  latestYmd: string | null;
};

function inspectMedicationPayload(payload: HyphenApiResponse): MedicationPayloadStats {
  const rows = normalizeTreatmentPayload(payload).list;
  if (rows.length === 0) {
    return { hasRows: false, hasNames: false, latestYmd: null };
  }

  let hasNames = false;
  let latestYmd: string | null = null;
  for (const row of rows) {
    const record = asRecord(row);
    if (!record) continue;
    if (!hasNames) {
      hasNames = MEDICATION_NAME_KEYS.some((key) => {
        const value = record[key];
        return value != null && String(value).trim().length > 0;
      });
    }
    for (const key of MEDICATION_DATE_KEYS) {
      const candidate = normalizeYmd(record[key]);
      if (!candidate) continue;
      if (!latestYmd || candidate > latestYmd) {
        latestYmd = candidate;
      }
      break;
    }
  }
  return { hasRows: true, hasNames, latestYmd };
}

function buildMedicationBackfillDateRanges(input: {
  latestYmd: string;
  requestDefaults: RequestDefaultsLike;
  originalFromDate?: string;
  originalToDate?: string;
}) {
  const anchorDate = parseYmdToDate(input.latestYmd);
  if (!anchorDate) return [] as Array<{ fromDate: string; toDate: string }>;
  const minYmd = isValidYmd(input.requestDefaults.fromDate)
    ? input.requestDefaults.fromDate
    : undefined;
  const maxYmd = isValidYmd(input.requestDefaults.toDate)
    ? input.requestDefaults.toDate
    : undefined;

  const monthStartDate = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1)
  );
  const monthEndDate = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + 1, 0)
  );
  const monthRange = {
    fromDate: clampYmd(formatDateToYmd(monthStartDate), minYmd, maxYmd),
    toDate: clampYmd(formatDateToYmd(monthEndDate), minYmd, maxYmd),
  };

  const rollingStartDate = new Date(anchorDate);
  rollingStartDate.setUTCDate(
    rollingStartDate.getUTCDate() - MEDICATION_BACKFILL_ROLLING_DAYS
  );
  const rollingRange = {
    fromDate: clampYmd(formatDateToYmd(rollingStartDate), minYmd, maxYmd),
    toDate: clampYmd(formatDateToYmd(anchorDate), minYmd, maxYmd),
  };

  const originalFrom = isValidYmd(input.originalFromDate)
    ? input.originalFromDate
    : null;
  const originalTo = isValidYmd(input.originalToDate) ? input.originalToDate : null;
  const seen = new Set<string>();
  const ranges: Array<{ fromDate: string; toDate: string }> = [];
  for (const candidate of [monthRange, rollingRange]) {
    if (!isValidYmd(candidate.fromDate) || !isValidYmd(candidate.toDate)) continue;
    if (candidate.fromDate > candidate.toDate) continue;
    if (originalFrom === candidate.fromDate && originalTo === candidate.toDate) {
      continue;
    }
    const signature = `${candidate.fromDate}|${candidate.toDate}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    ranges.push(candidate);
  }
  return ranges;
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
      const shouldProbeMedicalFallback =
        !input.targets.includes("medical") && !successful.has("medical");

      const tryMedicalFallback = async () => {
        if (!shouldProbeMedicalFallback) return false;
        try {
          // Prefer detail payload so medication names/ingredients can be included
          // when provider returns detailed prescription rows.
          const medicalFallback = await fetchMedicalInfo(input.detailPayload);
          if (!payloadHasAnyRows(medicalFallback)) return false;
          successful.set("medical", medicalFallback);
          return true;
        } catch (fallbackError) {
          logHyphenError(
            "[hyphen][fetch] medication empty; medical fallback failed",
            fallbackError
          );
          return false;
        }
      };

      const tryMedicationNameBackfill = async (
        seedPayload: HyphenApiResponse | null
      ): Promise<HyphenApiResponse | null> => {
        if (!seedPayload) return null;
        const seedStats = inspectMedicationPayload(seedPayload);
        if (!seedStats.hasRows || seedStats.hasNames || !seedStats.latestYmd) {
          return null;
        }
        const ranges = buildMedicationBackfillDateRanges({
          latestYmd: seedStats.latestYmd,
          requestDefaults: input.requestDefaults,
          originalFromDate: input.detailPayload.fromDate,
          originalToDate: input.detailPayload.toDate,
        });
        for (const range of ranges) {
          try {
            const retried = await fetchMedicationInfo({
              ...input.detailPayload,
              fromDate: range.fromDate,
              toDate: range.toDate,
            });
            const retriedStats = inspectMedicationPayload(retried);
            if (retriedStats.hasRows && retriedStats.hasNames) {
              return retried;
            }
          } catch (backfillError) {
            logHyphenError(
              "[hyphen][fetch] medication name backfill failed",
              backfillError
            );
          }
        }
        return null;
      };

      let detailPayloadResult: HyphenApiResponse | null = null;
      let detailPayloadError: unknown = null;
      let detailPayloadStats: MedicationPayloadStats = {
        hasRows: false,
        hasNames: false,
        latestYmd: null,
      };
      try {
        detailPayloadResult = await fetchMedicationInfo(input.detailPayload);
        detailPayloadStats = inspectMedicationPayload(detailPayloadResult);
        if (detailPayloadStats.hasRows && detailPayloadStats.hasNames) {
          return detailPayloadResult;
        }
      } catch (detailError) {
        detailPayloadResult = null;
        detailPayloadError = detailError;
      }

      let basePayloadResult: HyphenApiResponse | null = null;
      let basePayloadError: unknown = null;
      let basePayloadStats: MedicationPayloadStats = {
        hasRows: false,
        hasNames: false,
        latestYmd: null,
      };
      try {
        basePayloadResult = await fetchMedicationInfo(input.basePayload);
        basePayloadStats = inspectMedicationPayload(basePayloadResult);
        if (basePayloadStats.hasRows && basePayloadStats.hasNames) {
          return basePayloadResult;
        }
      } catch (baseError) {
        basePayloadResult = null;
        basePayloadError = baseError;
      }

      const bestMedicationPayload =
        detailPayloadStats.hasRows && detailPayloadResult
          ? detailPayloadResult
          : basePayloadStats.hasRows && basePayloadResult
            ? basePayloadResult
            : null;
      const backfilledMedicationPayload = await tryMedicationNameBackfill(
        bestMedicationPayload
      );
      if (backfilledMedicationPayload) {
        return backfilledMedicationPayload;
      }

      const recovered = await tryMedicalFallback();
      if (recovered) {
        return bestMedicationPayload ?? detailPayloadResult ?? basePayloadResult ?? emptyPayload();
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

      return bestMedicationPayload ?? detailPayloadResult ?? basePayloadResult ?? emptyPayload();
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
