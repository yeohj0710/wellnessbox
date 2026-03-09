import "server-only";

import type { NhisFetchRoutePayload } from "@/lib/server/hyphen/fetch-contract";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function toFetchRoutePayload(value: unknown): NhisFetchRoutePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.ok !== "boolean") return null;
  return record as NhisFetchRoutePayload;
}

export function isServeableNhisCachedPayload(value: unknown) {
  const parsed = toFetchRoutePayload(value);
  return parsed?.ok === true;
}

export type SessionArtifacts = {
  cookieData?: unknown;
  stepData?: unknown;
};

export type SuccessfulCacheLinkPatch = {
  lastIdentityHash?: string;
  lastErrorCode?: null;
  lastErrorMessage?: null;
};

export function buildSuccessfulCacheLinkPatch(input: {
  shouldUpdateIdentityHash: boolean;
  identityHash: string;
}) {
  const patch: SuccessfulCacheLinkPatch = {};
  if (input.shouldUpdateIdentityHash) {
    patch.lastIdentityHash = input.identityHash;
  }
  patch.lastErrorCode = null;
  patch.lastErrorMessage = null;
  return patch;
}

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

export function extractSessionArtifactsFromPayload(
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

export function buildCachedFetchResponseBody(input: {
  payload: NhisFetchRoutePayload;
  source: string;
  stale: boolean;
  fetchedAt: string;
  expiresAt: string;
  forceRefreshGuarded?: boolean;
  forceRefreshAgeSeconds?: number | null;
  forceRefreshGuardSeconds?: number | null;
}) {
  return {
    ...input.payload,
    cached: true,
    ...(input.forceRefreshGuarded
      ? {
          forceRefreshGuarded: true,
          forceRefreshAgeSeconds: input.forceRefreshAgeSeconds ?? null,
          forceRefreshGuardSeconds: input.forceRefreshGuardSeconds ?? null,
        }
      : {}),
    cache: {
      source: input.source,
      stale: input.stale,
      fetchedAt: input.fetchedAt,
      expiresAt: input.expiresAt,
    },
  };
}
