import "server-only";

import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { loadNhisStatusRouteData } from "@/lib/server/hyphen/status-route-data";
import { buildNhisStatusPayload } from "@/lib/server/hyphen/status-route-helpers";
import { requireNhisSession } from "@/lib/server/route-auth";

export async function runNhisStatusGetRoute(appUserId: string) {
  const now = new Date();
  const statusData = await loadNhisStatusRouteData({
    appUserId,
    now,
  });

  return nhisNoStoreJson(
    buildNhisStatusPayload({
      link: statusData.link,
      pendingAuthReady: statusData.pendingAuthReady,
      forceRefreshCooldown: statusData.forceRefreshCooldown,
      highCostTargetsEnabled: statusData.highCostTargetsEnabled,
      allowedTargets: statusData.allowedTargets,
      totalCacheEntries: statusData.totalCacheEntries,
      validCacheEntries: statusData.validCacheEntries,
      latestCacheEntry: statusData.latestCacheEntry,
      summaryCacheStatus: statusData.summaryCacheStatus,
      latestFetchAttemptAt: statusData.latestFetchAttemptAt,
      fetchBudget: statusData.fetchBudget,
    })
  );
}

export async function runNhisStatusGetAuthedRoute() {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  return runNhisStatusGetRoute(auth.data.appUserId);
}
