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

      const recovered = await tryMedicalFallback();
      if (recovered) {
        return detailPayloadResult ?? emptyPayload();
      }

      if (detailPayloadError) {
        throw detailPayloadError;
      }
      return detailPayloadResult ?? emptyPayload();
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

  const checkupListPayload =
    (successful.get("checkupList") as HyphenApiResponse[] | undefined) ?? [];
  const checkupYearlyPayload =
    (successful.get("checkupYearly") as HyphenApiResponse[] | undefined) ?? [];

  const normalized = normalizeNhisPayload({
    medical:
      (successful.get("medical") as HyphenApiResponse | undefined) ??
      emptyPayload(),
    medication:
      (successful.get("medication") as HyphenApiResponse | undefined) ??
      emptyPayload(),
    checkupList: checkupListPayload,
    checkupYearly: checkupYearlyPayload,
    checkupOverview:
      (successful.get("checkupOverview") as HyphenApiResponse | undefined) ??
      emptyPayload(),
    healthAge:
      (successful.get("healthAge") as HyphenApiResponse | undefined) ??
      emptyPayload(),
  });

  const payload: NhisFetchRoutePayload = {
    ok: true,
    partial: failed.length > 0,
    failed,
    data: {
      normalized,
      raw: {
        medical: successful.get("medical") ?? rawFailures.get("medical") ?? null,
        medication:
          successful.get("medication") ?? rawFailures.get("medication") ?? null,
        checkupList:
          (checkupListPayload.length > 0
            ? mergeListPayloads(checkupListPayload)
            : rawFailures.get("checkupList")) ?? null,
        checkupYearly:
          (checkupYearlyPayload.length > 0
            ? checkupYearlyPayload
            : rawFailures.get("checkupYearly")) ?? null,
        checkupOverview:
          successful.get("checkupOverview") ??
          rawFailures.get("checkupOverview") ??
          null,
        healthAge:
          successful.get("healthAge") ?? rawFailures.get("healthAge") ?? null,
        checkupListByYear: checkupListRawByYear,
      },
    },
  };

  return { payload, firstFailed: failed[0] };
}
