import {
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCacheByIdentity,
  resolveNhisIdentityHash,
} from "@/lib/server/hyphen/fetch-cache";
import { pickMostRecentDate } from "@/lib/server/hyphen/fetch-policy";
import type { NhisFetchBudgetSnapshot } from "@/lib/server/hyphen/fetch-attempt";

export const SUMMARY_STATUS_TARGET_SETS = [
  ["checkupOverview", "medication"],
  ["checkupOverview"],
] as const;

export const SUMMARY_STATUS_YEAR_LIMIT = 1;

export async function resolveSummaryCacheStatus(input: {
  appUserId: string;
  link:
    | {
        linked: boolean;
        loginOrgCd: string | null;
        lastIdentityHash: string | null;
      }
    | null
    | undefined;
  subjectType: string;
}) {
  if (!input.link?.linked) {
    return {
      summaryAvailable: false,
      summarySource: null as "valid" | "history" | null,
    };
  }

  const identity = resolveNhisIdentityHash({
    appUserId: input.appUserId,
    loginOrgCd: input.link.loginOrgCd,
    storedIdentityHash: input.link.lastIdentityHash,
  });

  const [summaryValidCaches, summaryHistoryCaches] = await Promise.all([
    Promise.all(
      SUMMARY_STATUS_TARGET_SETS.map((targets) =>
        getValidNhisFetchCacheByIdentity({
          appUserId: input.appUserId,
          identityHash: identity.identityHash,
          targets: [...targets],
          yearLimit: SUMMARY_STATUS_YEAR_LIMIT,
          subjectType: input.subjectType,
        })
      )
    ),
    Promise.all(
      SUMMARY_STATUS_TARGET_SETS.map((targets) =>
        getLatestNhisFetchCacheByIdentity({
          appUserId: input.appUserId,
          identityHash: identity.identityHash,
          targets: [...targets],
          yearLimit: SUMMARY_STATUS_YEAR_LIMIT,
          subjectType: input.subjectType,
        })
      )
    ),
  ]);

  const hasValidSummaryCache = summaryValidCaches.some((cache) => cache !== null);
  const hasHistorySummaryCache = summaryHistoryCaches.some(
    (cache) => cache !== null
  );

  return {
    summaryAvailable: hasValidSummaryCache || hasHistorySummaryCache,
    summarySource: hasValidSummaryCache
      ? ("valid" as const)
      : hasHistorySummaryCache
      ? ("history" as const)
      : null,
  };
}

export function resolveNhisStatusReferenceDate(input: {
  lastFetchedAt: Date | null | undefined;
  latestFetchAttemptAt: Date | null;
  latestCacheFetchedAt: Date | null | undefined;
}) {
  return pickMostRecentDate(
    input.lastFetchedAt ?? null,
    pickMostRecentDate(
      input.latestFetchAttemptAt,
      input.latestCacheFetchedAt ?? null
    )
  );
}

type NhisStatusLink =
  | {
      linked: boolean;
      provider: string;
      loginMethod: string | null;
      loginOrgCd: string | null;
      lastLinkedAt: Date | null;
      lastFetchedAt: Date | null;
      lastErrorCode: string | null;
      lastErrorMessage: string | null;
      stepData: unknown;
      cookieData: unknown;
    }
  | null
  | undefined;

type NhisLatestCacheEntry =
  | {
      fetchedAt: Date;
      expiresAt: Date;
      lastHitAt: Date | null;
      hitCount: number;
    }
  | null
  | undefined;

type NhisForceRefreshCooldown = {
  available: boolean;
  cooldownSeconds: number;
  remainingSeconds: number;
  availableAt: Date | null;
};

type NhisSummaryCacheStatus = {
  summaryAvailable: boolean;
  summarySource: "valid" | "history" | null;
};

function toIsoStringOrNull(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function buildNhisStatusPayload(input: {
  link: NhisStatusLink;
  pendingAuthReady: boolean;
  forceRefreshCooldown: NhisForceRefreshCooldown;
  highCostTargetsEnabled: boolean;
  allowedTargets: readonly string[];
  totalCacheEntries: number;
  validCacheEntries: number;
  latestCacheEntry: NhisLatestCacheEntry;
  summaryCacheStatus: NhisSummaryCacheStatus;
  latestFetchAttemptAt: Date | null;
  fetchBudget: NhisFetchBudgetSnapshot;
}) {
  return {
    ok: true,
    status: {
      linked: !!input.link?.linked,
      provider: input.link?.provider ?? "HYPHEN_NHIS",
      loginMethod: input.link?.loginMethod ?? null,
      loginOrgCd: input.link?.loginOrgCd ?? null,
      lastLinkedAt: toIsoStringOrNull(input.link?.lastLinkedAt),
      lastFetchedAt: toIsoStringOrNull(input.link?.lastFetchedAt),
      lastError:
        input.link?.lastErrorCode || input.link?.lastErrorMessage
          ? {
              code: input.link.lastErrorCode,
              message: input.link.lastErrorMessage,
            }
          : null,
      hasStepData: !!input.link?.stepData,
      hasCookieData: !!input.link?.cookieData,
      pendingAuthReady: input.pendingAuthReady,
      forceRefresh: {
        available: input.forceRefreshCooldown.available,
        cooldownSeconds: input.forceRefreshCooldown.cooldownSeconds,
        remainingSeconds: input.forceRefreshCooldown.remainingSeconds,
        availableAt: toIsoStringOrNull(input.forceRefreshCooldown.availableAt),
      },
      targetPolicy: {
        highCostTargetsEnabled: input.highCostTargetsEnabled,
        allowedTargets: input.allowedTargets,
      },
      cache: {
        totalEntries: input.totalCacheEntries,
        validEntries: input.validCacheEntries,
        summaryAvailable: input.summaryCacheStatus.summaryAvailable,
        summarySource: input.summaryCacheStatus.summarySource,
        latestFetchedAt: toIsoStringOrNull(input.latestCacheEntry?.fetchedAt),
        latestExpiresAt: toIsoStringOrNull(input.latestCacheEntry?.expiresAt),
        latestHitAt: toIsoStringOrNull(input.latestCacheEntry?.lastHitAt),
        latestHitCount: input.latestCacheEntry?.hitCount ?? 0,
      },
      latestFetchAttemptAt: toIsoStringOrNull(input.latestFetchAttemptAt),
      fetchBudget: input.fetchBudget,
    },
  };
}
