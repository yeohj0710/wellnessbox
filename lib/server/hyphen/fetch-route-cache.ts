import "server-only";

import { NextResponse } from "next/server";
import {
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  getValidNhisFetchCacheByIdentity,
  markNhisFetchCacheHit,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import {
  readNhisFetchMemoryCache,
  writeNhisFetchMemoryCache,
} from "@/lib/server/hyphen/fetch-memory-cache";
import {
  buildCachedFetchResponseBody,
  buildSuccessfulCacheLinkPatch,
  extractSessionArtifactsFromPayload,
  isServeableNhisCachedPayload,
  toFetchRoutePayload,
} from "@/lib/server/hyphen/fetch-route-cache-support";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { upsertNhisLink } from "@/lib/server/hyphen/link";
import { NO_STORE_HEADERS } from "@/lib/server/hyphen/route-utils";
import type { NhisFetchRoutePayload } from "./fetch-contract";

type RequestDefaultsLike = {
  fromDate: string;
  toDate: string;
  subjectType: string;
};

type TryServeNhisFetchCacheInput = {
  appUserId: string;
  requestHash: string;
  shouldUpdateIdentityHash: boolean;
  identityHash: string;
  targets: string[];
  yearLimit: number;
  subjectType: string;
  maxAgeSeconds?: number;
  allowHistoryFallback?: boolean;
  sourceOverride?: string;
  forceRefreshGuarded?: boolean;
};

type PersistNhisFetchResultInput = {
  appUserId: string;
  identityHash: string;
  requestHash: string;
  requestKey: string;
  targets: string[];
  yearLimit: number;
  requestDefaults: RequestDefaultsLike;
  statusCode: number;
  payload: NhisFetchRoutePayload;
  firstFailed?: { errCd?: string; errMsg?: string };
  updateFetchedAt: boolean;
  defaultErrorMessage?: string;
};
export { isServeableNhisCachedPayload };

export async function tryServeNhisFetchCache(input: TryServeNhisFetchCacheInput) {
  const memoryCached = readNhisFetchMemoryCache({
    appUserId: input.appUserId,
    requestHash: input.requestHash,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.yearLimit,
    subjectType: input.subjectType,
    allowHistoryFallback: input.allowHistoryFallback,
    maxAgeSeconds: input.maxAgeSeconds,
  });
  if (memoryCached) {
    const cachedPayload = memoryCached.entry.payload;
    if (!isServeableNhisCachedPayload(cachedPayload)) {
      // Do not serve failed payloads from memory cache; allow identity/history fallback.
    } else {
      const linkPatch = buildSuccessfulCacheLinkPatch({
        shouldUpdateIdentityHash: input.shouldUpdateIdentityHash,
        identityHash: input.identityHash,
      });

      await Promise.all([
        ...(memoryCached.entry.cacheId
          ? [markNhisFetchCacheHit(memoryCached.entry.cacheId)]
          : []),
        ...(Object.keys(linkPatch).length > 0
          ? [upsertNhisLink(input.appUserId, linkPatch)]
          : []),
      ]);

      const resolvedSource = input.sourceOverride || memoryCached.source;
      return NextResponse.json(
        buildCachedFetchResponseBody({
          payload: cachedPayload,
          source: resolvedSource,
          stale: memoryCached.stale,
          fetchedAt: new Date(memoryCached.entry.fetchedAtMs).toISOString(),
          expiresAt: new Date(memoryCached.entry.expiresAtMs).toISOString(),
          forceRefreshGuarded: input.forceRefreshGuarded,
          forceRefreshAgeSeconds: memoryCached.ageSeconds,
          forceRefreshGuardSeconds: input.maxAgeSeconds ?? null,
        }),
        { status: memoryCached.entry.statusCode, headers: NO_STORE_HEADERS }
      );
    }
  }

  const directCachedRaw = await getValidNhisFetchCache(
    input.appUserId,
    input.requestHash
  );
  const directCached =
    directCachedRaw && isServeableNhisCachedPayload(directCachedRaw.payload)
      ? directCachedRaw
      : null;
  const identityCachedRaw =
    directCached ??
    (await getValidNhisFetchCacheByIdentity({
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      targets: input.targets,
      yearLimit: input.yearLimit,
      subjectType: input.subjectType,
    }));
  const identityCached =
    identityCachedRaw && isServeableNhisCachedPayload(identityCachedRaw.payload)
      ? identityCachedRaw
      : null;
  const historyCachedRaw =
    !identityCached && input.allowHistoryFallback
      ? await getLatestNhisFetchCacheByIdentity({
          appUserId: input.appUserId,
          identityHash: input.identityHash,
          targets: input.targets,
          yearLimit: input.yearLimit,
          subjectType: input.subjectType,
        })
      : null;
  const historyCached =
    historyCachedRaw && isServeableNhisCachedPayload(historyCachedRaw.payload)
      ? historyCachedRaw
      : null;
  const selectedCache = identityCached ?? historyCached;
  if (!selectedCache) return null;

  let ageSeconds: number | null = null;
  if (typeof input.maxAgeSeconds === "number" && input.maxAgeSeconds >= 0) {
    ageSeconds = Math.max(
      0,
      Math.floor((Date.now() - selectedCache.fetchedAt.getTime()) / 1000)
    );
    if (ageSeconds > input.maxAgeSeconds) return null;
  }

  const cachedPayload = toFetchRoutePayload(selectedCache.payload);
  if (!cachedPayload || !cachedPayload.ok) return null;
  const stale = selectedCache.expiresAt.getTime() <= Date.now();
  const resolvedSource =
    input.sourceOverride ||
    (historyCached ? "db-history" : directCached ? "db" : "db-identity");

  const linkPatch = buildSuccessfulCacheLinkPatch({
    shouldUpdateIdentityHash: input.shouldUpdateIdentityHash,
    identityHash: input.identityHash,
  });

  await Promise.all([
    markNhisFetchCacheHit(selectedCache.id),
    ...(Object.keys(linkPatch).length > 0
      ? [
          upsertNhisLink(input.appUserId, linkPatch),
        ]
      : []),
  ]);

  writeNhisFetchMemoryCache({
    cacheId: selectedCache.id,
    appUserId: input.appUserId,
    requestHash: selectedCache.requestHash,
    identityHash: selectedCache.identityHash,
    targets: selectedCache.targets,
    yearLimit: input.yearLimit,
    subjectType: input.subjectType,
    statusCode: selectedCache.statusCode,
    payload: cachedPayload,
    fetchedAt: selectedCache.fetchedAt,
    expiresAt: selectedCache.expiresAt,
  });

  return NextResponse.json(
    buildCachedFetchResponseBody({
      payload: cachedPayload,
      source: resolvedSource,
      stale,
      fetchedAt: selectedCache.fetchedAt.toISOString(),
      expiresAt: selectedCache.expiresAt.toISOString(),
      forceRefreshGuarded: input.forceRefreshGuarded,
      forceRefreshAgeSeconds: ageSeconds,
      forceRefreshGuardSeconds: input.maxAgeSeconds ?? null,
    }),
    { status: selectedCache.statusCode, headers: NO_STORE_HEADERS }
  );
}

export async function persistNhisFetchResult(input: PersistNhisFetchResultInput) {
  const lastErrorCode = input.payload.ok ? null : input.firstFailed?.errCd ?? null;
  const lastErrorMessage = input.payload.ok
    ? null
    : input.firstFailed?.errMsg ?? (input.defaultErrorMessage ?? "Fetch failed");
  const sessionArtifacts = input.payload.ok
    ? extractSessionArtifactsFromPayload(input.payload)
    : {};

  const [, savedCache] = await Promise.all([
    upsertNhisLink(input.appUserId, {
      lastIdentityHash: input.identityHash,
      ...(input.updateFetchedAt ? { lastFetchedAt: new Date() } : {}),
      lastErrorCode,
      lastErrorMessage,
      ...(sessionArtifacts.cookieData !== undefined
        ? { cookieData: toPrismaJson(sessionArtifacts.cookieData) }
        : {}),
      ...(sessionArtifacts.stepData !== undefined
        ? { stepData: toPrismaJson(sessionArtifacts.stepData) }
        : {}),
    }),
    saveNhisFetchCache({
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      requestHash: input.requestHash,
      requestKey: input.requestKey,
      targets: input.targets,
      yearLimit: input.yearLimit,
      fromDate: input.requestDefaults.fromDate,
      toDate: input.requestDefaults.toDate,
      subjectType: input.requestDefaults.subjectType,
      statusCode: input.statusCode,
      payload: input.payload,
    }),
  ]);

  writeNhisFetchMemoryCache({
    cacheId: savedCache.id,
    appUserId: input.appUserId,
    requestHash: input.requestHash,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.yearLimit,
    subjectType: input.requestDefaults.subjectType,
    statusCode: input.statusCode,
    payload: input.payload,
    fetchedAt: savedCache.fetchedAt,
    expiresAt: savedCache.expiresAt,
  });
}
