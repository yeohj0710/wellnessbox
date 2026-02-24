"use client";

import type { NhisFetchResponse } from "./types";

const LOCAL_FETCH_CACHE_KEY = "health-link:latest-fetch:v1";
const LOCAL_FETCH_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type LocalFetchSnapshotV1 = {
  version: 1;
  savedAt: string;
  fetchedAt: string | null;
  data: NonNullable<NhisFetchResponse["data"]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readSnapshot(): LocalFetchSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_FETCH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.savedAt !== "string") return null;
    if (!("data" in parsed) || !isRecord(parsed.data)) return null;
    return parsed as LocalFetchSnapshotV1;
  } catch {
    return null;
  }
}

export function saveLocalNhisFetchData(options: {
  data: NhisFetchResponse["data"] | null | undefined;
  fetchedAt?: string | null;
}) {
  if (typeof window === "undefined") return;
  if (!options.data) {
    window.localStorage.removeItem(LOCAL_FETCH_CACHE_KEY);
    return;
  }

  try {
    const snapshot: LocalFetchSnapshotV1 = {
      version: 1,
      savedAt: new Date().toISOString(),
      fetchedAt: options.fetchedAt ?? null,
      data: options.data,
    };
    window.localStorage.setItem(
      LOCAL_FETCH_CACHE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // noop
  }
}

export function clearLocalNhisFetchData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_FETCH_CACHE_KEY);
  } catch {
    // noop
  }
}

export function restoreLocalNhisFetchData(options?: {
  expectedFetchedAt?: string | null;
}) {
  const snapshot = readSnapshot();
  if (!snapshot) return null;

  const savedAtMs = Date.parse(snapshot.savedAt);
  if (
    Number.isFinite(savedAtMs) &&
    Date.now() - savedAtMs > LOCAL_FETCH_CACHE_MAX_AGE_MS
  ) {
    clearLocalNhisFetchData();
    return null;
  }

  const expectedFetchedAt = options?.expectedFetchedAt ?? null;
  if (
    expectedFetchedAt &&
    snapshot.fetchedAt &&
    expectedFetchedAt !== snapshot.fetchedAt
  ) {
    return null;
  }

  return snapshot.data;
}

