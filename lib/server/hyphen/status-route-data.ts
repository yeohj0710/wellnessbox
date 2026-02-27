import "server-only";

import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { getNhisFetchBudgetSnapshot } from "@/lib/server/hyphen/fetch-attempt";
import { getLatestNhisFetchAttemptAt } from "@/lib/server/hyphen/fetch-cache";
import { computeNhisForceRefreshCooldown } from "@/lib/server/hyphen/fetch-policy";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  resolveNhisStatusReferenceDate,
  resolveSummaryCacheStatus,
} from "@/lib/server/hyphen/status-route-helpers";
import { getPendingEasyAuth } from "@/lib/server/hyphen/session";
import {
  isNhisHighCostTargetsEnabled,
  resolveAllowedNhisFetchTargets,
} from "@/lib/server/hyphen/target-policy";

export async function loadNhisStatusRouteData(input: {
  appUserId: string;
  now: Date;
}) {
  const requestDefaults = buildNhisRequestDefaults();
  const [
    link,
    pendingEasyAuth,
    totalCacheEntries,
    validCacheEntries,
    latestCacheEntry,
    fetchBudget,
    latestFetchAttemptAt,
  ] = await Promise.all([
    getNhisLink(input.appUserId),
    getPendingEasyAuth(),
    db.healthProviderFetchCache.count({
      where: { appUserId: input.appUserId, provider: HYPHEN_PROVIDER },
    }),
    db.healthProviderFetchCache.count({
      where: {
        appUserId: input.appUserId,
        provider: HYPHEN_PROVIDER,
        expiresAt: { gt: input.now },
      },
    }),
    db.healthProviderFetchCache.findFirst({
      where: { appUserId: input.appUserId, provider: HYPHEN_PROVIDER },
      orderBy: { fetchedAt: "desc" },
      select: {
        fetchedAt: true,
        expiresAt: true,
        lastHitAt: true,
        hitCount: true,
      },
    }),
    getNhisFetchBudgetSnapshot(input.appUserId, input.now),
    getLatestNhisFetchAttemptAt(input.appUserId),
  ]);

  const summaryCacheStatus = await resolveSummaryCacheStatus({
    appUserId: input.appUserId,
    link,
    subjectType: requestDefaults.subjectType,
  });

  const forceRefreshCooldown = computeNhisForceRefreshCooldown(
    resolveNhisStatusReferenceDate({
      lastFetchedAt: link?.lastFetchedAt ?? null,
      latestFetchAttemptAt,
      latestCacheFetchedAt: latestCacheEntry?.fetchedAt ?? null,
    }),
    input.now
  );

  return {
    link,
    pendingAuthReady: !!pendingEasyAuth,
    forceRefreshCooldown,
    highCostTargetsEnabled: isNhisHighCostTargetsEnabled(),
    allowedTargets: resolveAllowedNhisFetchTargets(),
    totalCacheEntries,
    validCacheEntries,
    latestCacheEntry,
    summaryCacheStatus,
    latestFetchAttemptAt,
    fetchBudget,
  };
}
