"use client";

import {
  normalizeAllResultsPayload,
  type NormalizedAllResults,
} from "@/app/chat/hooks/useChat.results";

const REMOTE_USER_CONTEXT_CACHE_KEY = "wb-remote-user-context:v1";
const DEFAULT_REMOTE_USER_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000;

type RemoteUserContextCacheSnapshot = {
  loadedAt: number;
  data: NormalizedAllResults;
};

let memoryCache: RemoteUserContextCacheSnapshot | null = null;
let inFlightRequest: Promise<NormalizedAllResults> | null = null;

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const REMOTE_USER_CONTEXT_CACHE_TTL_MS = readPositiveInteger(
  process.env.NEXT_PUBLIC_WB_USER_CONTEXT_CACHE_TTL_MS,
  DEFAULT_REMOTE_USER_CONTEXT_CACHE_TTL_MS
);

function isFreshSnapshot(
  snapshot: RemoteUserContextCacheSnapshot | null,
  now = Date.now()
) {
  return !!snapshot && now - snapshot.loadedAt <= REMOTE_USER_CONTEXT_CACHE_TTL_MS;
}

function parseSnapshot(
  value: unknown
): RemoteUserContextCacheSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const snapshot = value as {
    loadedAt?: unknown;
    data?: NormalizedAllResults;
  };
  const loadedAt =
    typeof snapshot.loadedAt === "number" && Number.isFinite(snapshot.loadedAt)
      ? snapshot.loadedAt
      : null;

  if (loadedAt === null || !snapshot.data) return null;

  return {
    loadedAt,
    data: snapshot.data,
  };
}

function readSessionCache(): RemoteUserContextCacheSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    return parseSnapshot(
      JSON.parse(
        window.sessionStorage.getItem(REMOTE_USER_CONTEXT_CACHE_KEY) ?? "null"
      )
    );
  } catch {
    return null;
  }
}

function writeSessionCache(snapshot: RemoteUserContextCacheSnapshot) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      REMOTE_USER_CONTEXT_CACHE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {}
}

function resolveFreshCache(): RemoteUserContextCacheSnapshot | null {
  if (isFreshSnapshot(memoryCache)) return memoryCache;

  const sessionCache = readSessionCache();
  if (!isFreshSnapshot(sessionCache)) {
    memoryCache = null;
    return null;
  }

  memoryCache = sessionCache;
  return memoryCache;
}

function storeCache(data: NormalizedAllResults) {
  const snapshot = {
    loadedAt: Date.now(),
    data,
  } satisfies RemoteUserContextCacheSnapshot;

  memoryCache = snapshot;
  writeSessionCache(snapshot);
  return data;
}

export function getCachedRemoteUserContext(): NormalizedAllResults | null {
  return resolveFreshCache()?.data ?? null;
}

export function clearRemoteUserContextCache() {
  memoryCache = null;
  inFlightRequest = null;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(REMOTE_USER_CONTEXT_CACHE_KEY);
  } catch {}
}

async function requestRemoteUserContext(): Promise<NormalizedAllResults> {
  try {
    const response = await fetch("/api/user/all-results", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return storeCache(normalizeAllResultsPayload({}));
    }

    const payload = await response.json().catch(() => ({}));
    return storeCache(normalizeAllResultsPayload(payload));
  } catch {
    return storeCache(normalizeAllResultsPayload({}));
  } finally {
    inFlightRequest = null;
  }
}

export function fetchRemoteUserContext(): Promise<NormalizedAllResults> {
  const cached = getCachedRemoteUserContext();
  if (cached) return Promise.resolve(cached);

  if (!inFlightRequest) {
    inFlightRequest = requestRemoteUserContext();
  }

  return inFlightRequest;
}
