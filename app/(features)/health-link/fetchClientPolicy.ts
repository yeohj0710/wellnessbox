import type { NhisFetchResponse } from "./types";

export const SUMMARY_FETCH_TARGETS = ["checkupOverview", "medication"] as const;
export const CHECKUP_DETAIL_TARGETS = ["checkupList", "checkupYearly"] as const;
export const DETAIL_YEAR_LIMIT = 1;

export type FetchMode = "summary" | "detail";

export type FetchMessages = {
  fallbackError: string;
  cachedMessage: string;
  forceRefreshGuardedMessage: string;
  partialMessage: string;
  successMessage: string;
};

export type FetchCacheInfo = {
  cached: boolean;
  source: string;
  fetchedAt?: string | null;
  expiresAt?: string | null;
};

export function mapFetchCacheInfo(
  payload: Pick<NhisFetchResponse, "cached" | "cache">
): FetchCacheInfo {
  return {
    cached: payload.cached === true,
    source: payload.cache?.source || "unknown",
    fetchedAt: payload.cache?.fetchedAt ?? null,
    expiresAt: payload.cache?.expiresAt ?? null,
  };
}

export function buildFetchNotice(
  payload: NhisFetchResponse,
  options: {
    cachedMessage: string;
    forceRefreshGuardedMessage: string;
    partialMessage: string;
    successMessage: string;
  }
) {
  if (payload.partial) return options.partialMessage;
  if (payload.forceRefreshGuarded) return options.forceRefreshGuardedMessage;
  if (payload.cached) return options.cachedMessage;
  return options.successMessage;
}

export function getFetchMessages(mode: FetchMode, forceRefresh: boolean): FetchMessages {
  return {
    fallbackError:
      mode === "detail"
        ? "상세 건강정보를 불러오지 못했습니다."
        : "건강정보를 불러오지 못했습니다.",
    cachedMessage: "저장된 정보를 반영했습니다.",
    forceRefreshGuardedMessage: "저장된 정보를 우선 반영했습니다.",
    partialMessage: "일부 항목만 먼저 반영했습니다.",
    successMessage: forceRefresh
      ? "최신 정보를 다시 불러왔습니다."
      : "최신 정보를 불러왔습니다.",
  };
}

export function buildForceRefreshCooldownMessage(remainingSeconds: number) {
  return `비용 보호를 위해 강제 새로고침은 ${remainingSeconds}초 후 다시 시도할 수 있습니다.`;
}
