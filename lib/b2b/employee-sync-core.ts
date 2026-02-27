const SYNC_ROUTE = "/api/b2b/employee/sync";
const MIN_FORCE_REFRESH_COOLDOWN_SECONDS = 10 * 60;
const MAX_FORCE_REFRESH_COOLDOWN_SECONDS = 30 * 60;
const DEFAULT_FORCE_REFRESH_COOLDOWN_SECONDS = 15 * 60;
const FORCE_REFRESH_DEBUG_HEADER = "x-wb-force-refresh-debug";
const FORCE_REFRESH_DEBUG_ENV = "B2B_ALLOW_FORCE_REFRESH_DEBUG_HEADER";
const FORCE_REFRESH_RESTRICTED_ERROR =
  "\uAC15\uC81C \uC7AC\uC870\uD68C\uB294 \uC6B4\uC601 \uC694\uAD6C\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
const FORCE_REFRESH_COOLDOWN_ERROR =
  "\uC7AC\uC5F0\uB3D9\uC740 \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export type ForceRefreshCooldown = {
  available: boolean;
  remainingSeconds: number;
  availableAt: string | null;
};

export type SyncAccessContext = {
  employeeId: string;
  appUserId: string;
  ip: string | null;
  userAgent: string | null;
};

export function resolveForceRefreshCooldownSeconds() {
  const parsed = Number(process.env.B2B_EMPLOYEE_FORCE_REFRESH_COOLDOWN_SECONDS);
  if (!Number.isFinite(parsed)) return DEFAULT_FORCE_REFRESH_COOLDOWN_SECONDS;
  const rounded = Math.round(parsed);
  return Math.min(
    MAX_FORCE_REFRESH_COOLDOWN_SECONDS,
    Math.max(MIN_FORCE_REFRESH_COOLDOWN_SECONDS, rounded)
  );
}

export function canBypassForceRefreshAdminWithDebugHeader(req: Request) {
  if (req.headers.get(FORCE_REFRESH_DEBUG_HEADER) !== "1") {
    return false;
  }
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const flag = (process.env[FORCE_REFRESH_DEBUG_ENV] || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function computeForceRefreshCooldown(
  lastSyncedAt: Date | null,
  cooldownSeconds: number
): ForceRefreshCooldown {
  if (!lastSyncedAt) {
    return {
      available: true,
      remainingSeconds: 0,
      availableAt: null,
    };
  }
  const availableAtMs = lastSyncedAt.getTime() + cooldownSeconds * 1000;
  const remainingMs = availableAtMs - Date.now();
  if (remainingMs <= 0) {
    return {
      available: true,
      remainingSeconds: 0,
      availableAt: null,
    };
  }
  return {
    available: false,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    availableAt: new Date(availableAtMs).toISOString(),
  };
}

export function resolvePostForceRefreshCooldown(cooldownSeconds: number) {
  return {
    remainingSeconds: cooldownSeconds,
    availableAt: new Date(Date.now() + cooldownSeconds * 1000).toISOString(),
  };
}

export function buildCooldownPayload(
  cooldownSeconds: number,
  remainingSeconds: number,
  availableAt: string | null
) {
  return {
    cooldownSeconds,
    remainingSeconds,
    availableAt,
  };
}

export function readClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export {
  FORCE_REFRESH_COOLDOWN_ERROR,
  FORCE_REFRESH_RESTRICTED_ERROR,
  SYNC_ROUTE,
};
