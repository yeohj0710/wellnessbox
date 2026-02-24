import "server-only";

import type { HyphenCommon } from "./client.contracts";

type HyphenRecord = Record<string, unknown>;

function asRecord(value: unknown): HyphenRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as HyphenRecord;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseYesNoFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "y";
}

export function resolveHyphenTimeoutMs() {
  const fallbackMs = 45_000;
  const raw = process.env.HYPHEN_HTTP_TIMEOUT_MS;
  if (!raw) return fallbackMs;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallbackMs;
  return Math.min(180_000, Math.max(10_000, Math.floor(parsed)));
}

export function resolveHyphenAuthHeaders(): Record<string, string> {
  const mode = (process.env.HYPHEN_AUTH_MODE || "header").toLowerCase();
  if (mode === "oauth") {
    const token = asNonEmptyString(process.env.HYPHEN_ACCESS_TOKEN);
    if (!token) {
      throw new Error(
        "HYPHEN_ACCESS_TOKEN must be configured when HYPHEN_AUTH_MODE=oauth"
      );
    }
    return { Authorization: `Bearer ${token}` };
  }

  const userId = asNonEmptyString(process.env.HYPHEN_USER_ID);
  const hkey = asNonEmptyString(process.env.HYPHEN_HKEY);
  if (!userId || !hkey) {
    throw new Error("HYPHEN_USER_ID and HYPHEN_HKEY must be configured");
  }
  return {
    "User-Id": userId,
    Hkey: hkey,
  };
}

export function shouldUseGustationHeader() {
  return parseYesNoFlag(process.env.HYPHEN_USE_GUSTATION);
}

export function normalizeCommon(payload: unknown): HyphenCommon {
  const root = asRecord(payload) ?? {};
  const common = asRecord(root.common) ?? {};
  return {
    userTrNo: asNonEmptyString(common.userTrNo),
    hyphenTrNo: asNonEmptyString(common.hyphenTrNo),
    errYn: asNonEmptyString(common.errYn),
    errCd: asNonEmptyString(common.errCd),
    errMsg: asNonEmptyString(common.errMsg),
  };
}

export function extractStepData(payload: unknown): unknown {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  return data?.stepData ?? data?.step_data ?? root?.stepData ?? root?.step_data;
}

export function extractCookieData(payload: unknown): unknown {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  return (
    data?.cookieData ??
    data?.cookie_data ??
    root?.cookieData ??
    root?.cookie_data
  );
}

export function getHyphenCommon(payload: unknown): HyphenCommon {
  return normalizeCommon(payload);
}
