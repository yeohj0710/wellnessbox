import "server-only";

import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import {
  buildNhisFetchRequestHash,
  resolveNhisFetchCacheTtlMinutes,
  resolveNhisIdentityHash,
  toNhisFetchCacheJsonValue,
  type FetchLikePayload,
} from "@/lib/server/hyphen/fetch-cache-support";
import {
  buildIdentityCacheLookupWhere,
  buildIdentityGlobalCacheLookupWhere,
  type IdentityCacheLookupInput,
  type IdentityCacheQueryMode,
  type IdentityGlobalCacheLookupInput,
} from "@/lib/server/hyphen/fetch-cache-query-support";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";

type SaveFetchCacheInput = {
  appUserId: string;
  identityHash: string;
  requestHash: string;
  requestKey: string;
  targets: string[];
  yearLimit?: number;
  fromDate?: string;
  toDate?: string;
  subjectType?: string;
  statusCode: number;
  payload: FetchLikePayload;
};

export { buildNhisFetchRequestHash, resolveNhisIdentityHash };

export async function getValidNhisFetchCache(appUserId: string, requestHash: string) {
  const now = new Date();
  const cached = await db.healthProviderFetchCache.findUnique({
    where: {
      appUserId_provider_requestHash: {
        appUserId,
        provider: HYPHEN_PROVIDER,
        requestHash,
      },
    },
  });

  if (!cached) return null;
  if (cached.expiresAt <= now) return null;
  return cached;
}

export async function getValidNhisFetchCacheByIdentity(input: IdentityCacheLookupInput) {
  return findNhisFetchCacheByIdentity(input, {
    includeExpired: false,
    okOnly: true,
  });
}

export async function getLatestNhisFetchCacheByIdentity(input: IdentityCacheLookupInput) {
  return findNhisFetchCacheByIdentity(input, {
    includeExpired: true,
    okOnly: true,
  });
}

export async function getLatestNhisFetchCacheByIdentityGlobal(
  input: IdentityGlobalCacheLookupInput
) {
  return db.healthProviderFetchCache.findFirst({
    where: buildIdentityGlobalCacheLookupWhere(input),
    orderBy: { fetchedAt: "desc" },
  });
}

async function findNhisFetchCacheByIdentity(
  input: IdentityCacheLookupInput,
  mode: IdentityCacheQueryMode
) {
  const cached = await db.healthProviderFetchCache.findFirst({
    where: buildIdentityCacheLookupWhere(input, mode, new Date()),
    orderBy: { fetchedAt: "desc" },
  });

  return cached;
}

export async function getLatestNhisFetchAttemptAt(appUserId: string) {
  try {
    const latestAttempt = await db.healthProviderFetchAttempt.findFirst({
      where: {
        appUserId,
        provider: HYPHEN_PROVIDER,
        cached: false,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latestAttempt?.createdAt) return latestAttempt.createdAt;
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2021"
      )
    ) {
      throw error;
    }
  }

  const latestCached = await db.healthProviderFetchCache.findFirst({
    where: {
      appUserId,
      provider: HYPHEN_PROVIDER,
    },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return latestCached?.fetchedAt ?? null;
}

export async function saveNhisFetchCache(input: SaveFetchCacheInput) {
  const now = new Date();
  const ttlMinutes = resolveNhisFetchCacheTtlMinutes(input.targets, input.payload);
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  return db.healthProviderFetchCache.upsert({
    where: {
      appUserId_provider_requestHash: {
        appUserId: input.appUserId,
        provider: HYPHEN_PROVIDER,
        requestHash: input.requestHash,
      },
    },
    create: {
      appUserId: input.appUserId,
      provider: HYPHEN_PROVIDER,
      identityHash: input.identityHash,
      requestHash: input.requestHash,
      requestKey: input.requestKey,
      targets: input.targets,
      yearLimit: input.yearLimit ?? null,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      subjectType: input.subjectType ?? null,
      statusCode: input.statusCode,
      ok: input.payload.ok,
      partial: !!input.payload.partial,
      payload: toNhisFetchCacheJsonValue(input.payload),
      fetchedAt: now,
      expiresAt,
      hitCount: 0,
      lastHitAt: null,
    },
    update: {
      identityHash: input.identityHash,
      requestKey: input.requestKey,
      targets: input.targets,
      yearLimit: input.yearLimit ?? null,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      subjectType: input.subjectType ?? null,
      statusCode: input.statusCode,
      ok: input.payload.ok,
      partial: !!input.payload.partial,
      payload: toNhisFetchCacheJsonValue(input.payload),
      fetchedAt: now,
      expiresAt,
      hitCount: 0,
      lastHitAt: null,
    },
  });
}

export async function markNhisFetchCacheHit(cacheId: string) {
  return db.healthProviderFetchCache.update({
    where: { id: cacheId },
    data: {
      hitCount: { increment: 1 },
      lastHitAt: new Date(),
    },
  });
}

export async function clearNhisFetchCaches(appUserId: string) {
  return db.healthProviderFetchCache.deleteMany({
    where: {
      appUserId,
      provider: HYPHEN_PROVIDER,
    },
  });
}

export async function runWithNhisFetchDedup<T>(
  key: string,
  runner: () => Promise<T>
): Promise<T> {
  return runWithHyphenInFlightDedup("nhis-fetch", key, runner);
}
