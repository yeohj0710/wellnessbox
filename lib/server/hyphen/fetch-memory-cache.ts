import "server-only";

import type { NhisFetchRoutePayload } from "@/lib/server/hyphen/fetch-contract";

type MemoryCacheEntry = {
  cacheId: string | null;
  appUserId: string;
  requestHash: string;
  identityHash: string;
  targetsKey: string;
  yearLimit: number;
  subjectType: string;
  statusCode: number;
  payload: NhisFetchRoutePayload;
  fetchedAtMs: number;
  expiresAtMs: number;
};

type MemoryLookupInput = {
  appUserId: string;
  requestHash: string;
  identityHash: string;
  targets: string[];
  yearLimit: number;
  subjectType: string;
  allowHistoryFallback?: boolean;
  maxAgeSeconds?: number;
};

type MemoryLookupResult = {
  entry: MemoryCacheEntry;
  source: "memory" | "memory-identity" | "memory-history" | "memory-history-identity";
  stale: boolean;
  ageSeconds: number;
};

type MemoryWriteInput = {
  cacheId?: string | null;
  appUserId: string;
  requestHash: string;
  identityHash: string;
  targets: string[];
  yearLimit: number;
  subjectType: string;
  statusCode: number;
  payload: NhisFetchRoutePayload;
  fetchedAt: Date;
  expiresAt: Date;
};

const DEFAULT_MAX_ENTRIES = 1200;
const DEFAULT_HISTORY_GRACE_MINUTES = 60 * 24 * 90;

const memoryByRequest = new Map<string, MemoryCacheEntry>();
const memoryByIdentity = new Map<string, string>();

function normalizeTargets(targets: string[]) {
  return [...new Set(targets.map((item) => item.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .join(",");
}

function buildRequestKey(appUserId: string, requestHash: string) {
  return `${appUserId}|${requestHash}`;
}

function buildIdentityKey(input: {
  appUserId: string;
  identityHash: string;
  targets: string[];
  yearLimit: number;
  subjectType: string;
}) {
  return [
    input.appUserId,
    input.identityHash,
    normalizeTargets(input.targets),
    String(input.yearLimit),
    input.subjectType || "-",
  ].join("|");
}

function resolveMaxEntries() {
  const raw = process.env.HYPHEN_NHIS_MEMORY_CACHE_MAX_ENTRIES;
  if (!raw) return DEFAULT_MAX_ENTRIES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_ENTRIES;
  return Math.max(100, Math.floor(parsed));
}

function resolveHistoryGraceMs() {
  const raw = process.env.HYPHEN_NHIS_MEMORY_HISTORY_GRACE_MINUTES;
  if (!raw) return DEFAULT_HISTORY_GRACE_MINUTES * 60 * 1000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_HISTORY_GRACE_MINUTES * 60 * 1000;
  return Math.max(30, Math.floor(parsed)) * 60 * 1000;
}

function dropMemoryEntry(requestKey: string, entry?: MemoryCacheEntry) {
  const target = entry ?? memoryByRequest.get(requestKey);
  if (!target) return;
  memoryByRequest.delete(requestKey);

  const identityKey = buildIdentityKey({
    appUserId: target.appUserId,
    identityHash: target.identityHash,
    targets: target.targetsKey ? target.targetsKey.split(",") : [],
    yearLimit: target.yearLimit,
    subjectType: target.subjectType,
  });
  const mappedRequestKey = memoryByIdentity.get(identityKey);
  if (mappedRequestKey === requestKey) {
    memoryByIdentity.delete(identityKey);
  }
}

function trimExpired(nowMs: number) {
  const graceMs = resolveHistoryGraceMs();
  for (const [requestKey, entry] of memoryByRequest.entries()) {
    if (entry.expiresAtMs + graceMs > nowMs) continue;
    dropMemoryEntry(requestKey, entry);
  }
}

function trimToLimit() {
  const maxEntries = resolveMaxEntries();
  if (memoryByRequest.size <= maxEntries) return;
  const overflow = memoryByRequest.size - maxEntries;
  const candidates = [...memoryByRequest.entries()]
    .sort((left, right) => left[1].fetchedAtMs - right[1].fetchedAtMs)
    .slice(0, overflow);
  for (const [requestKey, entry] of candidates) {
    dropMemoryEntry(requestKey, entry);
  }
}

function toLookupResult(options: {
  entry: MemoryCacheEntry;
  source: MemoryLookupResult["source"];
  nowMs: number;
  maxAgeSeconds?: number;
  allowStale: boolean;
}): MemoryLookupResult | null {
  const ageSeconds = Math.max(
    0,
    Math.floor((options.nowMs - options.entry.fetchedAtMs) / 1000)
  );
  if (
    typeof options.maxAgeSeconds === "number" &&
    options.maxAgeSeconds >= 0 &&
    ageSeconds > options.maxAgeSeconds
  ) {
    return null;
  }

  const stale = options.entry.expiresAtMs <= options.nowMs;
  if (stale && !options.allowStale) return null;

  return {
    entry: options.entry,
    source: options.source,
    stale,
    ageSeconds,
  };
}

export function readNhisFetchMemoryCache(
  input: MemoryLookupInput
): MemoryLookupResult | null {
  const nowMs = Date.now();
  trimExpired(nowMs);

  const requestKey = buildRequestKey(input.appUserId, input.requestHash);
  const direct = memoryByRequest.get(requestKey);
  const directResult = direct
    ? toLookupResult({
        entry: direct,
        source: "memory",
        nowMs,
        maxAgeSeconds: input.maxAgeSeconds,
        allowStale: false,
      })
    : null;
  if (directResult) return directResult;

  const identityKey = buildIdentityKey({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.yearLimit,
    subjectType: input.subjectType,
  });
  const identityRequestKey = memoryByIdentity.get(identityKey);
  const identityEntry = identityRequestKey
    ? memoryByRequest.get(identityRequestKey)
    : null;
  const identityResult = identityEntry
    ? toLookupResult({
        entry: identityEntry,
        source: "memory-identity",
        nowMs,
        maxAgeSeconds: input.maxAgeSeconds,
        allowStale: false,
      })
    : null;
  if (identityResult) return identityResult;

  if (!input.allowHistoryFallback) return null;

  const directHistoryResult = direct
    ? toLookupResult({
        entry: direct,
        source: "memory-history",
        nowMs,
        maxAgeSeconds: input.maxAgeSeconds,
        allowStale: true,
      })
    : null;
  if (directHistoryResult) return directHistoryResult;

  const identityHistoryResult = identityEntry
    ? toLookupResult({
        entry: identityEntry,
        source: "memory-history-identity",
        nowMs,
        maxAgeSeconds: input.maxAgeSeconds,
        allowStale: true,
      })
    : null;
  if (identityHistoryResult) return identityHistoryResult;

  return null;
}

export function writeNhisFetchMemoryCache(input: MemoryWriteInput) {
  const requestKey = buildRequestKey(input.appUserId, input.requestHash);
  const targetsKey = normalizeTargets(input.targets);
  const entry: MemoryCacheEntry = {
    cacheId: input.cacheId ?? null,
    appUserId: input.appUserId,
    requestHash: input.requestHash,
    identityHash: input.identityHash,
    targetsKey,
    yearLimit: input.yearLimit,
    subjectType: input.subjectType,
    statusCode: input.statusCode,
    payload: input.payload,
    fetchedAtMs: input.fetchedAt.getTime(),
    expiresAtMs: input.expiresAt.getTime(),
  };

  memoryByRequest.set(requestKey, entry);
  memoryByIdentity.set(
    buildIdentityKey({
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      targets: input.targets,
      yearLimit: input.yearLimit,
      subjectType: input.subjectType,
    }),
    requestKey
  );

  trimExpired(Date.now());
  trimToLimit();
}

export function clearNhisFetchMemoryCacheForUser(appUserId: string) {
  for (const [requestKey, entry] of memoryByRequest.entries()) {
    if (entry.appUserId !== appUserId) continue;
    dropMemoryEntry(requestKey, entry);
  }
}
