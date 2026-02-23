import "server-only";

import { NextResponse } from "next/server";
import {
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  getValidNhisFetchCacheByIdentity,
  markNhisFetchCacheHit,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
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

function toFetchRoutePayload(value: unknown): NhisFetchRoutePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.ok !== "boolean") return null;
  return record as NhisFetchRoutePayload;
}

export async function tryServeNhisFetchCache(input: TryServeNhisFetchCacheInput) {
  const directCached = await getValidNhisFetchCache(input.appUserId, input.requestHash);
  const identityCached =
    directCached ??
    (await getValidNhisFetchCacheByIdentity({
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      targets: input.targets,
      yearLimit: input.yearLimit,
      subjectType: input.subjectType,
    }));
  const historyCached =
    !identityCached && input.allowHistoryFallback
      ? await getLatestNhisFetchCacheByIdentity({
          appUserId: input.appUserId,
          identityHash: input.identityHash,
          targets: input.targets,
          yearLimit: input.yearLimit,
          subjectType: input.subjectType,
        })
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
  if (!cachedPayload) return null;
  const stale = selectedCache.expiresAt.getTime() <= Date.now();
  const resolvedSource =
    input.sourceOverride ||
    (historyCached ? "db-history" : directCached ? "db" : "db-identity");

  const linkPatch: {
    lastIdentityHash?: string;
    lastErrorCode?: null;
    lastErrorMessage?: null;
  } = {};
  if (input.shouldUpdateIdentityHash) {
    linkPatch.lastIdentityHash = input.identityHash;
  }
  if (cachedPayload.ok) {
    // Successful cached payloads should not keep stale session-expired errors.
    linkPatch.lastErrorCode = null;
    linkPatch.lastErrorMessage = null;
  }

  await Promise.all([
    markNhisFetchCacheHit(selectedCache.id),
    ...(Object.keys(linkPatch).length > 0
      ? [
          upsertNhisLink(input.appUserId, linkPatch),
        ]
      : []),
  ]);

  return NextResponse.json(
    {
      ...cachedPayload,
      cached: true,
      ...(input.forceRefreshGuarded
        ? {
            forceRefreshGuarded: true,
            forceRefreshAgeSeconds: ageSeconds,
            forceRefreshGuardSeconds: input.maxAgeSeconds ?? null,
          }
        : {}),
      cache: {
        source: resolvedSource,
        stale,
        fetchedAt: selectedCache.fetchedAt.toISOString(),
        expiresAt: selectedCache.expiresAt.toISOString(),
      },
    },
    { status: selectedCache.statusCode, headers: NO_STORE_HEADERS }
  );
}

export async function persistNhisFetchResult(input: PersistNhisFetchResultInput) {
  const lastErrorCode = input.payload.ok ? null : input.firstFailed?.errCd ?? null;
  const lastErrorMessage = input.payload.ok
    ? null
    : input.firstFailed?.errMsg ?? (input.defaultErrorMessage ?? "Fetch failed");

  await Promise.all([
    upsertNhisLink(input.appUserId, {
      lastIdentityHash: input.identityHash,
      ...(input.updateFetchedAt ? { lastFetchedAt: new Date() } : {}),
      lastErrorCode,
      lastErrorMessage,
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
}
