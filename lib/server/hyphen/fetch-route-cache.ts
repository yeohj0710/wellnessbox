import "server-only";

import { NextResponse } from "next/server";
import {
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
  if (!identityCached) return null;

  let ageSeconds: number | null = null;
  if (typeof input.maxAgeSeconds === "number" && input.maxAgeSeconds >= 0) {
    ageSeconds = Math.max(
      0,
      Math.floor((Date.now() - identityCached.fetchedAt.getTime()) / 1000)
    );
    if (ageSeconds > input.maxAgeSeconds) return null;
  }

  const cachedPayload = toFetchRoutePayload(identityCached.payload);
  if (!cachedPayload) return null;

  await Promise.all([
    markNhisFetchCacheHit(identityCached.id),
    ...(input.shouldUpdateIdentityHash
      ? [
          upsertNhisLink(input.appUserId, {
            lastIdentityHash: input.identityHash,
          }),
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
        source: input.sourceOverride || (directCached ? "db" : "db-identity"),
        fetchedAt: identityCached.fetchedAt.toISOString(),
        expiresAt: identityCached.expiresAt.toISOString(),
      },
    },
    { status: identityCached.statusCode, headers: NO_STORE_HEADERS }
  );
}

export async function persistNhisFetchResult(input: PersistNhisFetchResultInput) {
  await Promise.all([
    upsertNhisLink(input.appUserId, {
      lastIdentityHash: input.identityHash,
      ...(input.updateFetchedAt ? { lastFetchedAt: new Date() } : {}),
      lastErrorCode: input.firstFailed?.errCd ?? null,
      lastErrorMessage:
        input.firstFailed?.errMsg ?? (input.payload.ok ? null : input.defaultErrorMessage ?? "Fetch failed"),
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
