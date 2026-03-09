import "server-only";

import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import type {
  NhisFetchFailedItem,
  NhisFetchRoutePayload,
  NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { mergeListPayloads } from "@/lib/server/hyphen/fetch-executor.helpers";
import { normalizeNhisPayload } from "@/lib/server/hyphen/normalize";

type FetchSuccessMap = Map<NhisFetchTarget, unknown>;
type FetchRawFailureMap = Map<NhisFetchTarget, unknown>;

export function getErrorBody(error: unknown): unknown | null {
  if (!error || typeof error !== "object") return null;
  const candidate = (error as { body?: unknown }).body;
  return candidate ?? null;
}

export function emptyPayload(): HyphenApiResponse {
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

export function payloadHasAnyRows(payload: HyphenApiResponse) {
  const data = resolvePayloadData(payload);
  if (Array.isArray(data.list) && data.list.length > 0) return true;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) return true;
  }
  return false;
}

export function getTargetPayload<T>(
  successful: FetchSuccessMap,
  target: NhisFetchTarget
): T | undefined {
  return successful.get(target) as T | undefined;
}

export function buildSuccessfulFetchPayload(input: {
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
