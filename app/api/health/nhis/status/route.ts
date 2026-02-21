import { NextResponse } from "next/server";
import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { getNhisFetchBudgetSnapshot } from "@/lib/server/hyphen/fetch-attempt";
import { getLatestNhisFetchAttemptAt } from "@/lib/server/hyphen/fetch-cache";
import {
  computeNhisForceRefreshCooldown,
  pickMostRecentDate,
} from "@/lib/server/hyphen/fetch-policy";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { getPendingEasyAuth } from "@/lib/server/hyphen/session";
import {
  isNhisHighCostTargetsEnabled,
  resolveAllowedNhisFetchTargets,
} from "@/lib/server/hyphen/target-policy";
import { NO_STORE_HEADERS } from "@/lib/server/hyphen/route-utils";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const [link, pendingEasyAuth, totalCacheEntries, validCacheEntries, latestCacheEntry, fetchBudget, latestFetchAttemptAt] =
    await Promise.all([
      getNhisLink(auth.data.appUserId),
      getPendingEasyAuth(),
      db.healthProviderFetchCache.count({
        where: {
          appUserId: auth.data.appUserId,
          provider: HYPHEN_PROVIDER,
        },
      }),
      db.healthProviderFetchCache.count({
        where: {
          appUserId: auth.data.appUserId,
          provider: HYPHEN_PROVIDER,
          expiresAt: { gt: now },
        },
      }),
      db.healthProviderFetchCache.findFirst({
        where: {
          appUserId: auth.data.appUserId,
          provider: HYPHEN_PROVIDER,
        },
        orderBy: { fetchedAt: "desc" },
        select: {
          fetchedAt: true,
          expiresAt: true,
          lastHitAt: true,
          hitCount: true,
        },
      }),
      getNhisFetchBudgetSnapshot(auth.data.appUserId, now),
      getLatestNhisFetchAttemptAt(auth.data.appUserId),
    ]);

  const forceRefreshCooldown = computeNhisForceRefreshCooldown(
    pickMostRecentDate(
      link?.lastFetchedAt ?? null,
      pickMostRecentDate(latestFetchAttemptAt, latestCacheEntry?.fetchedAt ?? null)
    ),
    now
  );
  const highCostTargetsEnabled = isNhisHighCostTargetsEnabled();
  const allowedTargets = resolveAllowedNhisFetchTargets();

  return NextResponse.json(
    {
      ok: true,
      status: {
        linked: !!link?.linked,
        provider: link?.provider ?? "HYPHEN_NHIS",
        loginMethod: link?.loginMethod ?? null,
        loginOrgCd: link?.loginOrgCd ?? null,
        lastLinkedAt: link?.lastLinkedAt?.toISOString() ?? null,
        lastFetchedAt: link?.lastFetchedAt?.toISOString() ?? null,
        lastError: link?.lastErrorCode || link?.lastErrorMessage
          ? {
              code: link.lastErrorCode,
              message: link.lastErrorMessage,
            }
          : null,
        hasStepData: !!link?.stepData,
        hasCookieData: !!link?.cookieData,
        pendingAuthReady: !!pendingEasyAuth,
        forceRefresh: {
          available: forceRefreshCooldown.available,
          cooldownSeconds: forceRefreshCooldown.cooldownSeconds,
          remainingSeconds: forceRefreshCooldown.remainingSeconds,
          availableAt: forceRefreshCooldown.availableAt?.toISOString() ?? null,
        },
        targetPolicy: {
          highCostTargetsEnabled,
          allowedTargets,
        },
        cache: {
          totalEntries: totalCacheEntries,
          validEntries: validCacheEntries,
          latestFetchedAt: latestCacheEntry?.fetchedAt?.toISOString() ?? null,
          latestExpiresAt: latestCacheEntry?.expiresAt?.toISOString() ?? null,
          latestHitAt: latestCacheEntry?.lastHitAt?.toISOString() ?? null,
          latestHitCount: latestCacheEntry?.hitCount ?? 0,
        },
        latestFetchAttemptAt: latestFetchAttemptAt?.toISOString() ?? null,
        fetchBudget,
      },
    },
    {
      headers: NO_STORE_HEADERS,
    }
  );
}
