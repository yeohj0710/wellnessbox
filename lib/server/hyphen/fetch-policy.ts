import "server-only";

import {
  computeCooldownState,
  pickMostRecentDate,
} from "@/lib/shared/nhis-fetch-policy";

const DEFAULT_FORCE_REFRESH_COOLDOWN_SECONDS = 90;
const DEFAULT_FORCE_REFRESH_CACHE_GUARD_SECONDS = 60 * 30;

type CooldownState = {
  cooldownSeconds: number;
  remainingSeconds: number;
  available: boolean;
  availableAt: Date | null;
};

function envPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function envNonNegativeInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export function resolveNhisForceRefreshCooldownSeconds() {
  return envPositiveInt(
    "HYPHEN_NHIS_FORCE_REFRESH_COOLDOWN_SECONDS",
    DEFAULT_FORCE_REFRESH_COOLDOWN_SECONDS
  );
}

export function resolveNhisForceRefreshCacheGuardSeconds() {
  return envNonNegativeInt(
    "HYPHEN_NHIS_FORCE_REFRESH_CACHE_GUARD_SECONDS",
    DEFAULT_FORCE_REFRESH_CACHE_GUARD_SECONDS
  );
}

export { pickMostRecentDate };

export function computeNhisForceRefreshCooldown(
  lastAttemptAt?: Date | null,
  now: Date = new Date()
): CooldownState {
  const cooldownSeconds = resolveNhisForceRefreshCooldownSeconds();
  return computeCooldownState(cooldownSeconds, lastAttemptAt, now);
}
