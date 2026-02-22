import "server-only";

import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";

const DEFAULT_BUDGET_WINDOW_HOURS = 24;
const DEFAULT_MAX_FRESH_FETCHES_PER_WINDOW = 6;
const DEFAULT_MAX_FORCE_REFRESHES_PER_WINDOW = 2;

type FetchBudgetDecisionReason = "fresh" | "forceRefresh";

export type NhisFetchBudgetSnapshot = {
  windowHours: number;
  fresh: {
    used: number;
    limit: number;
    remaining: number;
  };
  forceRefresh: {
    used: number;
    limit: number;
    remaining: number;
  };
};

export type NhisFetchBudgetDecision =
  | {
      available: true;
      snapshot: NhisFetchBudgetSnapshot;
    }
  | {
      available: false;
      reason: FetchBudgetDecisionReason;
      retryAfterSec: number;
      snapshot: NhisFetchBudgetSnapshot;
    };

type RecordNhisFetchAttemptInput = {
  appUserId: string;
  identityHash: string;
  requestHash: string;
  requestKey: string;
  forceRefresh: boolean;
  cached: boolean;
  statusCode: number;
  ok: boolean;
};

function envPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function resolveBudgetWindowHours() {
  return envPositiveInt(
    "HYPHEN_NHIS_FETCH_BUDGET_WINDOW_HOURS",
    DEFAULT_BUDGET_WINDOW_HOURS
  );
}

function resolveFreshFetchLimit() {
  return envPositiveInt(
    "HYPHEN_NHIS_MAX_FRESH_FETCHES_PER_WINDOW",
    DEFAULT_MAX_FRESH_FETCHES_PER_WINDOW
  );
}

function resolveForceRefreshLimit() {
  return envPositiveInt(
    "HYPHEN_NHIS_MAX_FORCE_REFRESHES_PER_WINDOW",
    DEFAULT_MAX_FORCE_REFRESHES_PER_WINDOW
  );
}

function computeWindowStart(now: Date, windowHours: number) {
  return new Date(now.getTime() - windowHours * 60 * 60 * 1000);
}

async function countAttempts(options: {
  appUserId: string;
  windowStart: Date;
  filterMode: "all" | "freshOnly" | "forceRefreshOnly";
}) {
  const forceRefreshFilter =
    options.filterMode === "forceRefreshOnly"
      ? { forceRefresh: true }
      : options.filterMode === "freshOnly"
        ? { forceRefresh: false }
        : {};

  return db.healthProviderFetchAttempt.count({
    where: {
      appUserId: options.appUserId,
      provider: HYPHEN_PROVIDER,
      cached: false,
      createdAt: { gte: options.windowStart },
      ...forceRefreshFilter,
    },
  });
}

async function computeRetryAfterSec(options: {
  appUserId: string;
  now: Date;
  windowStart: Date;
  windowHours: number;
  filterMode: "freshOnly" | "forceRefreshOnly";
}) {
  const forceRefreshFilter =
    options.filterMode === "forceRefreshOnly"
      ? { forceRefresh: true }
      : { forceRefresh: false };

  const earliest = await db.healthProviderFetchAttempt.findFirst({
    where: {
      appUserId: options.appUserId,
      provider: HYPHEN_PROVIDER,
      cached: false,
      createdAt: { gte: options.windowStart },
      ...forceRefreshFilter,
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (!earliest) return 60;

  const availableAt = new Date(
    earliest.createdAt.getTime() + options.windowHours * 60 * 60 * 1000
  );
  return Math.max(1, Math.ceil((availableAt.getTime() - options.now.getTime()) / 1000));
}

function buildBudgetSnapshot(input: {
  windowHours: number;
  freshLimit: number;
  forceRefreshLimit: number;
  freshUsed: number;
  forceRefreshUsed: number;
}): NhisFetchBudgetSnapshot {
  return {
    windowHours: input.windowHours,
    fresh: {
      used: input.freshUsed,
      limit: input.freshLimit,
      remaining: Math.max(0, input.freshLimit - input.freshUsed),
    },
    forceRefresh: {
      used: input.forceRefreshUsed,
      limit: input.forceRefreshLimit,
      remaining: Math.max(0, input.forceRefreshLimit - input.forceRefreshUsed),
    },
  };
}

export async function getNhisFetchBudgetSnapshot(
  appUserId: string,
  now: Date = new Date()
): Promise<NhisFetchBudgetSnapshot> {
  const windowHours = resolveBudgetWindowHours();
  const freshLimit = resolveFreshFetchLimit();
  const forceRefreshLimit = resolveForceRefreshLimit();
  const windowStart = computeWindowStart(now, windowHours);

  const [freshUsed, forceRefreshUsed] = await Promise.all([
    countAttempts({
      appUserId,
      windowStart,
      filterMode: "freshOnly",
    }),
    countAttempts({
      appUserId,
      windowStart,
      filterMode: "forceRefreshOnly",
    }),
  ]);

  return buildBudgetSnapshot({
    windowHours,
    freshLimit,
    forceRefreshLimit,
    freshUsed,
    forceRefreshUsed,
  });
}

export async function evaluateNhisFetchBudget(input: {
  appUserId: string;
  forceRefresh: boolean;
  now?: Date;
}): Promise<NhisFetchBudgetDecision> {
  const now = input.now ?? new Date();
  const windowHours = resolveBudgetWindowHours();
  const freshLimit = resolveFreshFetchLimit();
  const forceRefreshLimit = resolveForceRefreshLimit();
  const windowStart = computeWindowStart(now, windowHours);

  const [freshUsed, forceRefreshUsed] = await Promise.all([
    countAttempts({
      appUserId: input.appUserId,
      windowStart,
      filterMode: "freshOnly",
    }),
    countAttempts({
      appUserId: input.appUserId,
      windowStart,
      filterMode: "forceRefreshOnly",
    }),
  ]);

  const snapshot = buildBudgetSnapshot({
    windowHours,
    freshLimit,
    forceRefreshLimit,
    freshUsed,
    forceRefreshUsed,
  });

  let blockedReason: FetchBudgetDecisionReason | null = null;
  if (freshUsed >= freshLimit) {
    blockedReason = "fresh";
  } else if (input.forceRefresh && forceRefreshUsed >= forceRefreshLimit) {
    blockedReason = "forceRefresh";
  }

  if (!blockedReason) {
    return {
      available: true,
      snapshot,
    };
  }

  const retryAfterSec = await computeRetryAfterSec({
    appUserId: input.appUserId,
    now,
    windowStart,
    windowHours,
    filterMode: blockedReason === "forceRefresh" ? "forceRefreshOnly" : "freshOnly",
  });

  return {
    available: false,
    reason: blockedReason,
    retryAfterSec,
    snapshot,
  };
}

export async function recordNhisFetchAttempt(input: RecordNhisFetchAttemptInput) {
  return db.healthProviderFetchAttempt.create({
    data: {
      appUserId: input.appUserId,
      provider: HYPHEN_PROVIDER,
      identityHash: input.identityHash,
      requestHash: input.requestHash,
      requestKey: input.requestKey,
      forceRefresh: input.forceRefresh,
      cached: input.cached,
      statusCode: input.statusCode,
      ok: input.ok,
    },
  });
}
