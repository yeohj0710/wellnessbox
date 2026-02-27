import type { NhisFetchBudgetDecision } from "@/lib/server/hyphen/fetch-attempt";
import {
  NHIS_FETCH_DAILY_LIMIT_ERR_CODE,
  NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE,
  NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import { tryServeNhisFetchCache } from "@/lib/server/hyphen/fetch-route-cache";
import {
  computeNhisForceRefreshCooldown,
  pickMostRecentDate,
  resolveNhisForceRefreshCacheGuardSeconds,
} from "@/lib/server/hyphen/fetch-policy";
import { nhisNoStoreRetryJson } from "@/lib/server/hyphen/nhis-route-responses";

type RequestHashMeta = {
  requestHash: string;
  normalizedTargets: string[];
};

type TryServeFetchGateInput = {
  forceRefresh: boolean;
  appUserId: string;
  requestHashMeta: RequestHashMeta;
  shouldUpdateIdentityHash: boolean;
  identityHash: string;
  yearLimit: number;
  subjectType: string;
  lastFetchedAt: Date | null | undefined;
  latestFetchAttemptAt: Date | null;
};

type BlockedBudgetDecision = Extract<NhisFetchBudgetDecision, { available: false }>;

export async function tryServeFetchGateCache(
  input: TryServeFetchGateInput
) {
  if (input.forceRefresh) {
    const forceRefreshCacheGuardSeconds =
      resolveNhisForceRefreshCacheGuardSeconds();
    if (forceRefreshCacheGuardSeconds > 0) {
      const guardedCachedResponse = await tryServeNhisFetchCache({
        appUserId: input.appUserId,
        requestHash: input.requestHashMeta.requestHash,
        shouldUpdateIdentityHash: input.shouldUpdateIdentityHash,
        identityHash: input.identityHash,
        targets: input.requestHashMeta.normalizedTargets,
        yearLimit: input.yearLimit,
        subjectType: input.subjectType,
        maxAgeSeconds: forceRefreshCacheGuardSeconds,
        sourceOverride: "db-force-guard",
        forceRefreshGuarded: true,
      });
      if (guardedCachedResponse) return guardedCachedResponse;
    }

    const cooldown = computeNhisForceRefreshCooldown(
      pickMostRecentDate(input.lastFetchedAt, input.latestFetchAttemptAt)
    );
    if (!cooldown.available) {
      const retryAfter = cooldown.remainingSeconds;
      return nhisNoStoreRetryJson(
        {
          ok: false,
          error: `Force refresh is limited to one request per ${cooldown.cooldownSeconds} seconds.`,
          errCd: NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE,
          errMsg: `Retry after ${retryAfter} seconds.`,
          retryAfterSec: retryAfter,
        },
        429,
        retryAfter
      );
    }

    return null;
  }

  return tryServeNhisFetchCache({
    appUserId: input.appUserId,
    requestHash: input.requestHashMeta.requestHash,
    shouldUpdateIdentityHash: input.shouldUpdateIdentityHash,
    identityHash: input.identityHash,
    targets: input.requestHashMeta.normalizedTargets,
    yearLimit: input.yearLimit,
    subjectType: input.subjectType,
    allowHistoryFallback: true,
  });
}

export function buildFetchBudgetBlockedResponse(
  fetchBudget: BlockedBudgetDecision
) {
  const blockedState =
    fetchBudget.reason === "forceRefresh"
      ? fetchBudget.snapshot.forceRefresh
      : fetchBudget.snapshot.fresh;
  const errCd =
    fetchBudget.reason === "forceRefresh"
      ? NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE
      : NHIS_FETCH_DAILY_LIMIT_ERR_CODE;
  return nhisNoStoreRetryJson(
    {
      ok: false,
      error:
        fetchBudget.reason === "forceRefresh"
          ? "Force refresh budget is exhausted for this window."
          : "Fresh fetch budget is exhausted for this window.",
      errCd,
      errMsg: `Used ${blockedState.used}/${blockedState.limit} in last ${fetchBudget.snapshot.windowHours}h.`,
      retryAfterSec: fetchBudget.retryAfterSec,
      budget: fetchBudget.snapshot,
    },
    429,
    fetchBudget.retryAfterSec
  );
}
