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
  if (payload.forceRefreshGuarded) return options.forceRefreshGuardedMessage;
  if (payload.cached) return options.cachedMessage;
  if (payload.partial) return options.partialMessage;
  return options.successMessage;
}

export function getFetchMessages(mode: FetchMode, forceRefresh: boolean): FetchMessages {
  if (mode === "detail") {
    return {
      fallbackError: forceRefresh
        ? "상세 수치 강제 새로고침에 실패했습니다."
        : "상세 수치 데이터 조회에 실패했습니다.",
      cachedMessage: "캐시된 상세 수치 데이터를 불러왔습니다. (추가 유료 호출 없음)",
      forceRefreshGuardedMessage:
        "최근 조회 이력이 있어 비용 보호 모드로 캐시 데이터를 재사용했습니다.",
      partialMessage: forceRefresh
        ? "강제 새로고침에서 일부 상세 항목 조회에 실패했습니다."
        : "일부 상세 항목 조회에 실패했습니다. 실패 항목을 확인해 주세요.",
      successMessage: forceRefresh
        ? "상세 수치 강제 새로고침이 완료되었습니다."
        : "상세 수치 데이터를 불러왔습니다. (최근 1년 기준)",
    };
  }

  return {
    fallbackError: forceRefresh
      ? "최신 검진/투약 강제 새로고침에 실패했습니다."
      : "최신 검진/투약 데이터 조회에 실패했습니다.",
    cachedMessage: "캐시된 최신 검진/투약 데이터를 불러왔습니다. (추가 유료 호출 없음)",
    forceRefreshGuardedMessage:
      "최근 조회 이력이 있어 비용 보호 모드로 캐시 데이터를 재사용했습니다.",
    partialMessage: forceRefresh
      ? "강제 새로고침에서 일부 항목 조회에 실패했습니다."
      : "일부 항목 조회에 실패했습니다. 실패 항목을 확인해 주세요.",
    successMessage: forceRefresh
      ? "최신 검진/투약 강제 새로고침이 완료되었습니다."
      : "최신 검진 1회차와 투약 요약을 불러왔습니다.",
  };
}

export function buildForceRefreshCooldownMessage(remainingSeconds: number) {
  return `비용 보호를 위해 강제 새로고침은 ${remainingSeconds}초 후 다시 시도할 수 있습니다.`;
}
