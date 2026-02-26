import "server-only";

import getSession from "@/lib/session";

const PENDING_AUTH_TTL_MS = 60 * 60 * 1000;
const DEFAULT_SIGN_MIN_INTERVAL_SECONDS = 20;
const DEFAULT_SIGN_WINDOW_SECONDS = 15 * 60;
const DEFAULT_SIGN_MAX_ATTEMPTS_PER_WINDOW = 8;

export type HyphenPendingEasyAuth = {
  loginMethod: "EASY";
  loginOrgCd: string;
  resNm: string;
  resNo: string;
  mobileNo: string;
  mobileCo?: string;
  savedAt: string;
};

export type HyphenSignThrottleSnapshot = {
  minIntervalSeconds: number;
  windowSeconds: number;
  maxAttemptsPerWindow: number;
  usedInWindow: number;
  remainingInWindow: number;
  lastAttemptAt: string | null;
};

export type HyphenSignThrottleDecision =
  | {
      allowed: true;
      snapshot: HyphenSignThrottleSnapshot;
    }
  | {
      allowed: false;
      reason: "min_interval" | "window_limit";
      retryAfterSec: number;
      availableAt: string;
      snapshot: HyphenSignThrottleSnapshot;
    };

type HyphenSessionShape = {
  pendingEasyAuth?: HyphenPendingEasyAuth;
  signAttemptHistory?: string[];
};

type SessionWithHyphen = Awaited<ReturnType<typeof getSession>> & {
  hyphen?: HyphenSessionShape;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePendingEasyAuth(raw: unknown): HyphenPendingEasyAuth | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.loginMethod !== "EASY") return null;
  if (!isNonEmptyString(value.loginOrgCd)) return null;
  if (!isNonEmptyString(value.resNm)) return null;
  if (!isNonEmptyString(value.resNo)) return null;
  if (!isNonEmptyString(value.mobileNo)) return null;
  if (!isNonEmptyString(value.savedAt)) return null;
  return {
    loginMethod: "EASY",
    loginOrgCd: value.loginOrgCd,
    resNm: value.resNm,
    resNo: value.resNo,
    mobileNo: value.mobileNo,
    mobileCo: isNonEmptyString(value.mobileCo) ? value.mobileCo : undefined,
    savedAt: value.savedAt,
  };
}

function envClampedInt(
  name: string,
  fallback: number,
  min: number,
  max: number
) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function resolveSignThrottlePolicy() {
  return {
    minIntervalSeconds: envClampedInt(
      "HYPHEN_NHIS_SIGN_MIN_INTERVAL_SECONDS",
      DEFAULT_SIGN_MIN_INTERVAL_SECONDS,
      5,
      120
    ),
    windowSeconds: envClampedInt(
      "HYPHEN_NHIS_SIGN_WINDOW_SECONDS",
      DEFAULT_SIGN_WINDOW_SECONDS,
      60,
      24 * 60 * 60
    ),
    maxAttemptsPerWindow: envClampedInt(
      "HYPHEN_NHIS_SIGN_MAX_ATTEMPTS_PER_WINDOW",
      DEFAULT_SIGN_MAX_ATTEMPTS_PER_WINDOW,
      1,
      30
    ),
  };
}

function parseSignAttemptHistory(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const parsed: number[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) continue;
    parsed.push(timestamp);
  }
  return parsed.sort((left, right) => left - right);
}

function toSignAttemptHistoryValues(values: number[]) {
  return values.map((timestamp) => new Date(timestamp).toISOString());
}

function buildSignThrottleSnapshot(input: {
  minIntervalSeconds: number;
  windowSeconds: number;
  maxAttemptsPerWindow: number;
  attemptsInWindow: number[];
}) {
  const usedInWindow = input.attemptsInWindow.length;
  return {
    minIntervalSeconds: input.minIntervalSeconds,
    windowSeconds: input.windowSeconds,
    maxAttemptsPerWindow: input.maxAttemptsPerWindow,
    usedInWindow,
    remainingInWindow: Math.max(0, input.maxAttemptsPerWindow - usedInWindow),
    lastAttemptAt:
      usedInWindow > 0
        ? new Date(input.attemptsInWindow[usedInWindow - 1]!).toISOString()
        : null,
  } satisfies HyphenSignThrottleSnapshot;
}

export async function savePendingEasyAuth(
  payload: Omit<HyphenPendingEasyAuth, "savedAt">
) {
  const session = (await getSession()) as SessionWithHyphen;
  session.hyphen = {
    ...(session.hyphen ?? {}),
    signAttemptHistory: [],
    pendingEasyAuth: {
      ...payload,
      savedAt: new Date().toISOString(),
    },
  };
  await session.save();
}

export async function getPendingEasyAuth(): Promise<HyphenPendingEasyAuth | null> {
  const session = (await getSession()) as SessionWithHyphen;
  const parsed = parsePendingEasyAuth(session.hyphen?.pendingEasyAuth);
  if (!parsed) return null;

  const savedAt = new Date(parsed.savedAt);
  if (!Number.isFinite(savedAt.getTime())) return null;
  if (Date.now() - savedAt.getTime() > PENDING_AUTH_TTL_MS) {
    session.hyphen = { ...(session.hyphen ?? {}), pendingEasyAuth: undefined };
    await session.save();
    return null;
  }

  return parsed;
}

export async function clearPendingEasyAuth() {
  const session = (await getSession()) as SessionWithHyphen;
  if (!session.hyphen?.pendingEasyAuth && !session.hyphen?.signAttemptHistory) return;
  session.hyphen = {
    ...(session.hyphen ?? {}),
    pendingEasyAuth: undefined,
    signAttemptHistory: [],
  };
  await session.save();
}

export async function evaluateAndRecordSignAttempt(
  now: Date = new Date()
): Promise<HyphenSignThrottleDecision> {
  const session = (await getSession()) as SessionWithHyphen;
  const policy = resolveSignThrottlePolicy();
  const nowMs = now.getTime();
  const windowStartMs = nowMs - policy.windowSeconds * 1000;
  const attemptsInWindow = parseSignAttemptHistory(
    session.hyphen?.signAttemptHistory
  ).filter((value) => value >= windowStartMs);

  const baseSnapshot = buildSignThrottleSnapshot({
    minIntervalSeconds: policy.minIntervalSeconds,
    windowSeconds: policy.windowSeconds,
    maxAttemptsPerWindow: policy.maxAttemptsPerWindow,
    attemptsInWindow,
  });

  const lastAttemptMs =
    attemptsInWindow.length > 0
      ? attemptsInWindow[attemptsInWindow.length - 1]!
      : null;
  if (lastAttemptMs !== null) {
    const nextAllowedAtMs = lastAttemptMs + policy.minIntervalSeconds * 1000;
    if (nextAllowedAtMs > nowMs) {
      return {
        allowed: false,
        reason: "min_interval",
        retryAfterSec: Math.max(1, Math.ceil((nextAllowedAtMs - nowMs) / 1000)),
        availableAt: new Date(nextAllowedAtMs).toISOString(),
        snapshot: baseSnapshot,
      };
    }
  }

  if (attemptsInWindow.length >= policy.maxAttemptsPerWindow) {
    const oldestAttemptMs = attemptsInWindow[0]!;
    const nextAllowedAtMs = oldestAttemptMs + policy.windowSeconds * 1000;
    return {
      allowed: false,
      reason: "window_limit",
      retryAfterSec: Math.max(1, Math.ceil((nextAllowedAtMs - nowMs) / 1000)),
      availableAt: new Date(nextAllowedAtMs).toISOString(),
      snapshot: baseSnapshot,
    };
  }

  const updatedAttempts = [...attemptsInWindow, nowMs].slice(-120);
  session.hyphen = {
    ...(session.hyphen ?? {}),
    signAttemptHistory: toSignAttemptHistoryValues(updatedAttempts),
  };
  await session.save();

  return {
    allowed: true,
    snapshot: buildSignThrottleSnapshot({
      minIntervalSeconds: policy.minIntervalSeconds,
      windowSeconds: policy.windowSeconds,
      maxAttemptsPerWindow: policy.maxAttemptsPerWindow,
      attemptsInWindow: updatedAttempts,
    }),
  };
}
