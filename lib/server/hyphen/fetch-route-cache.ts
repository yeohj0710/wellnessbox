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

function toFetchRoutePayload(value: unknown): NhisFetchRoutePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.ok !== "boolean") return null;
  return record as NhisFetchRoutePayload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

type SessionArtifacts = {
  cookieData?: unknown;
  stepData?: unknown;
};

function collectSessionArtifacts(
  value: unknown,
  found: SessionArtifacts,
  depth = 0
) {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSessionArtifacts(item, found, depth + 1);
      if (found.cookieData !== undefined && found.stepData !== undefined) return;
    }
    return;
  }

  const record = asRecord(value);
  if (!record) return;
  const data = asRecord(record.data);
  const cookieData =
    data?.cookieData ?? data?.cookie_data ?? record.cookieData ?? record.cookie_data;
  if (found.cookieData === undefined && cookieData != null) {
    found.cookieData = cookieData;
  }
  const stepData =
    data?.stepData ?? data?.step_data ?? record.stepData ?? record.step_data;
  if (found.stepData === undefined && stepData != null) {
    found.stepData = stepData;
  }
  if (found.cookieData !== undefined && found.stepData !== undefined) return;

  for (const child of Object.values(record)) {
    collectSessionArtifacts(child, found, depth + 1);
    if (found.cookieData !== undefined && found.stepData !== undefined) return;
  }
}

function extractSessionArtifactsFromPayload(
  payload: NhisFetchRoutePayload
): SessionArtifacts {
  const data = asRecord(payload.data);
  const raw = asRecord(data?.raw);
  if (!raw) return {};

  const orderedCandidates = [
    raw.medication,
    raw.medical,
    raw.checkupOverview,
    raw.healthAge,
    raw.checkupYearly,
    raw.checkupList,
  ];
  const found: SessionArtifacts = {};
  for (const candidate of orderedCandidates) {
    collectSessionArtifacts(candidate, found);
    if (found.cookieData !== undefined && found.stepData !== undefined) break;
  }
  return found;
}

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
    const linkPatch: {
      lastIdentityHash?: string;
      lastErrorCode?: null;
      lastErrorMessage?: null;
    } = {};
    if (input.shouldUpdateIdentityHash) {
      linkPatch.lastIdentityHash = input.identityHash;
    }
    if (cachedPayload.ok) {
      linkPatch.lastErrorCode = null;
      linkPatch.lastErrorMessage = null;
    }

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
      {
        ...cachedPayload,
        cached: true,
        ...(input.forceRefreshGuarded
          ? {
              forceRefreshGuarded: true,
              forceRefreshAgeSeconds: memoryCached.ageSeconds,
              forceRefreshGuardSeconds: input.maxAgeSeconds ?? null,
            }
          : {}),
        cache: {
          source: resolvedSource,
          stale: memoryCached.stale,
          fetchedAt: new Date(memoryCached.entry.fetchedAtMs).toISOString(),
          expiresAt: new Date(memoryCached.entry.expiresAtMs).toISOString(),
        },
      },
      { status: memoryCached.entry.statusCode, headers: NO_STORE_HEADERS }
    );
  }

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
