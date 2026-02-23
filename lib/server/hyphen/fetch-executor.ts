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
  DEFAULT_DETAIL_YEAR_LIMIT,
  MAX_CHECKUP_LIST_YEARS_PER_REQUEST,
  MAX_CHECKUP_YEARLY_REQUESTS_PER_FETCH,
  type NhisFetchFailedItem,
  type NhisFetchRoutePayload,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { normalizeCheckupOverviewPayload } from "@/lib/server/hyphen/normalize-checkup";
import { normalizeNhisPayload } from "@/lib/server/hyphen/normalize";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";
import {
  getErrorCodeMessage,
  logHyphenError,
} from "@/lib/server/hyphen/route-utils";

type DetailKeyPair = {
  detailKey: string;
  detailKey2?: string;
};

type RequestDefaultsLike = {
  fromDate?: string;
  toDate?: string;
};

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

function parseYears(fromDate?: string, toDate?: string, maxYears = 15) {
  const fromYear = Number((fromDate || "").slice(0, 4));
  const toYear = Number((toDate || "").slice(0, 4));
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
    return [String(currentYear)];
  }

  const start = Math.max(1900, Math.min(fromYear, toYear));
  const end = Math.min(2100, Math.max(fromYear, toYear));
  const years: string[] = [];
  for (let year = end; year >= start; year -= 1) {
    years.push(String(year));
    if (years.length >= maxYears) break;
  }
  return years;
}

function toNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function collectDetailKeyPairs(input: unknown, maxPairs = 20): DetailKeyPair[] {
  const out: DetailKeyPair[] = [];
  const seen = new Set<string>();

  function visit(value: unknown, depth: number) {
    if (depth > 8 || out.length >= maxPairs) return;
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (out.length >= maxPairs) break;
        visit(item, depth + 1);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    const detailKey =
      toNonEmptyText(record.detailKey) ??
      toNonEmptyText(record.detail_key) ??
      toNonEmptyText(record.detailkey);
    const detailKey2 =
      toNonEmptyText(record.detailKey2) ??
      toNonEmptyText(record.detail_key2) ??
      toNonEmptyText(record.detailkey2);

    if (detailKey) {
      const signature = `${detailKey}|${detailKey2 ?? ""}`;
      if (!seen.has(signature)) {
        seen.add(signature);
        out.push({ detailKey, detailKey2: detailKey2 ?? undefined });
      }
    }

    for (const child of Object.values(record)) {
      if (out.length >= maxPairs) break;
      visit(child, depth + 1);
    }
  }

  visit(input, 0);
  return out;
}

function mergeListPayloads(payloads: HyphenApiResponse[]) {
  const mergedList: unknown[] = [];
  const years: string[] = [];

  for (const payload of payloads) {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const list = Array.isArray(data.list) ? data.list : [];
    mergedList.push(...list);

    const yyyy = toNonEmptyText(data.yyyy ?? data.year ?? data.businessYear);
    if (yyyy) years.push(yyyy);
  }

  return {
    data: {
      list: mergedList,
      years,
    },
  } as HyphenApiResponse;
}

function normalizeYearLimit(value: number) {
  return Math.max(
    DEFAULT_DETAIL_YEAR_LIMIT,
    Math.min(value, MAX_CHECKUP_LIST_YEARS_PER_REQUEST)
  );
}

const YMD_PATTERN = /^\d{8}$/;
const MEDICATION_PROBE_WINDOWS_DAYS = [30, 180, 365] as const;

function parseYmd(value: string | undefined): Date | null {
  if (!value || !YMD_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month, day));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatYmdUtc(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function shiftDaysUtc(base: Date, days: number): Date {
  const shifted = new Date(base.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function hasMeaningfulCheckupRow(payload: HyphenApiResponse) {
  const checkupRows = normalizeCheckupOverviewPayload(payload);
  return checkupRows.some((row) => {
    const metric = typeof row.metric === "string" ? row.metric.trim() : "";
    const itemName = typeof row.itemName === "string" ? row.itemName.trim() : "";
    const itemData = row.itemData == null ? "" : String(row.itemData).trim();
    const result = row.result == null ? "" : String(row.result).trim();
    return metric || itemName || itemData || result;
  });
}

function hasMedicationRow(payload: HyphenApiResponse) {
  return normalizeTreatmentPayload(payload).list.length > 0;
}

function hasNoDataSignal(reason: unknown) {
  const info = getErrorCodeMessage(reason);
  const merged = `${info.code ?? ""} ${info.message ?? ""}`.toLowerCase();
  return (
    merged.includes("no data") ||
    merged.includes("조회 결과") ||
    merged.includes("조회결과") ||
    merged.includes("내역이 없습니다") ||
    merged.includes("데이터가 없습니다")
  );
}

function resolveMedicationProbeWindows(requestDefaults: RequestDefaultsLike) {
  const to = parseYmd(requestDefaults.toDate);
  const from = parseYmd(requestDefaults.fromDate);
  if (!to) {
    return [
      {
        fromDate: requestDefaults.fromDate,
        toDate: requestDefaults.toDate,
      },
    ];
  }

  const windows: Array<{ fromDate: string | undefined; toDate: string | undefined }> = [];
  const seen = new Set<string>();
  const pushWindow = (fromDate: string | undefined, toDate: string | undefined) => {
    const key = `${fromDate ?? "-"}|${toDate ?? "-"}`;
    if (seen.has(key)) return;
    seen.add(key);
    windows.push({ fromDate, toDate });
  };

  for (const days of MEDICATION_PROBE_WINDOWS_DAYS) {
    const candidateFrom = shiftDaysUtc(to, -(days - 1));
    const boundedFrom =
      from && candidateFrom.getTime() < from.getTime() ? from : candidateFrom;
    pushWindow(formatYmdUtc(boundedFrom), formatYmdUtc(to));
  }

  pushWindow(
    requestDefaults.fromDate ?? (from ? formatYmdUtc(from) : undefined),
    requestDefaults.toDate ?? formatYmdUtc(to)
  );

  return windows;
}

async function fetchLatestMedicationPayload(input: {
  detailPayload: HyphenNhisRequestPayload;
  requestDefaults: RequestDefaultsLike;
}) {
  const windows = resolveMedicationProbeWindows(input.requestDefaults);
  let lastPayload: HyphenApiResponse | null = null;

  for (const window of windows) {
    const payload = await fetchMedicationInfo({
      ...input.detailPayload,
      ...(window.fromDate ? { fromDate: window.fromDate } : {}),
      ...(window.toDate ? { toDate: window.toDate } : {}),
    });
    lastPayload = payload;
    if (hasMedicationRow(payload)) return payload;
  }

  if (lastPayload) return lastPayload;
  return fetchMedicationInfo(input.detailPayload);
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

  const needsCheckupOverview = input.targets.includes("checkupOverview");
  const needsMedication = input.targets.includes("medication");
  if (needsCheckupOverview && needsMedication) {
    independentJobs.push(
      (async () => {
        let shouldFallbackToMedication = false;
        let pendingCheckupError: unknown | null = null;

        try {
          const checkupPayload = await fetchCheckupOverview(input.basePayload);
          successful.set("checkupOverview", checkupPayload);
          shouldFallbackToMedication = !hasMeaningfulCheckupRow(checkupPayload);
        } catch (error) {
          pendingCheckupError = error;
          shouldFallbackToMedication = hasNoDataSignal(error);
        }

        if (!shouldFallbackToMedication) {
          if (pendingCheckupError) {
            markFailure(
              "checkupOverview",
              pendingCheckupError,
              "\uac80\uc9c4 \uacb0\uacfc\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
            );
          }
          return;
        }

        try {
          const medicationPayload = await fetchLatestMedicationPayload({
            detailPayload: input.detailPayload,
            requestDefaults: input.requestDefaults,
          });
          successful.set("medication", medicationPayload);
        } catch (medicationError) {
          if (pendingCheckupError) {
            markFailure(
              "checkupOverview",
              pendingCheckupError,
              "\uac80\uc9c4 \uacb0\uacfc\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
            );
          }
          markFailure(
            "medication",
            medicationError,
            "\ud22c\uc57d \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
          );
        }
      })()
    );
  } else {
    runIndependentTarget(
      "checkupOverview",
      () => fetchCheckupOverview(input.basePayload),
      "검진 요약을 불러오지 못했습니다."
    );
    runIndependentTarget(
      "medication",
      () =>
        fetchLatestMedicationPayload({
          detailPayload: input.detailPayload,
          requestDefaults: input.requestDefaults,
        }),
      "\ud22c\uc57d \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
    );
  }

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
