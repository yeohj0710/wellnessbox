const EMPLOYEE_ACCESS_ACTION_THROTTLE_SEC: Record<string, number> = {
  session_status: 60,
  session_login_attempt: 90,
  session_login_success: 90,
  report_view: 60,
  report_export_pdf: 45,
  report_export_pdf_validation_failed: 90,
};

const ADMIN_ACTION_THROTTLE_SEC: Record<string, number> = {
  report_export_pdf: 45,
  report_export_pptx: 45,
  report_export_validation_failed: 90,
  report_export_pdf_validation_failed: 90,
};

const MAX_MEMORY_KEYS = 5000;

const memoryTtlByKey = new Map<string, number>();

function envPositiveInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  return Math.min(max, Math.max(min, rounded));
}

function normalizeToken(value: string | null | undefined) {
  if (typeof value !== "string") return "-";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

function trimExpiredMemory(nowMs: number) {
  for (const [key, expiresAtMs] of memoryTtlByKey.entries()) {
    if (expiresAtMs <= nowMs) {
      memoryTtlByKey.delete(key);
    }
  }
}

function trimOverflowMemory() {
  if (memoryTtlByKey.size <= MAX_MEMORY_KEYS) return;
  const overflow = memoryTtlByKey.size - MAX_MEMORY_KEYS;
  const keys = memoryTtlByKey.keys();
  for (let index = 0; index < overflow; index += 1) {
    const next = keys.next();
    if (next.done) break;
    memoryTtlByKey.delete(next.value);
  }
}

function resolveThrottleWindowMs(
  action: string,
  map: Record<string, number>,
  envName: string
) {
  const normalizedAction = action.trim();
  const actionSec = map[normalizedAction];
  if (!actionSec) return 0;
  const globalSec = envPositiveInt(envName, actionSec, 5, 3600);
  return globalSec * 1000;
}

export function resolveEmployeeAccessLogThrottleMs(action: string) {
  return resolveThrottleWindowMs(
    action,
    EMPLOYEE_ACCESS_ACTION_THROTTLE_SEC,
    "WB_B2B_EMPLOYEE_ACCESS_LOG_THROTTLE_SEC"
  );
}

export function resolveAdminActionLogThrottleMs(action: string) {
  return resolveThrottleWindowMs(
    action,
    ADMIN_ACTION_THROTTLE_SEC,
    "WB_B2B_ADMIN_ACTION_LOG_THROTTLE_SEC"
  );
}

export function buildEmployeeAccessThrottleKey(input: {
  employeeId?: string | null;
  appUserId?: string | null;
  action: string;
  route?: string | null;
}) {
  return [
    "employee-access",
    normalizeToken(input.employeeId),
    normalizeToken(input.appUserId),
    normalizeToken(input.action),
    normalizeToken(input.route),
  ].join("|");
}

export function buildAdminActionThrottleKey(input: {
  employeeId?: string | null;
  action: string;
  actorTag?: string | null;
}) {
  return [
    "admin-action",
    normalizeToken(input.employeeId),
    normalizeToken(input.action),
    normalizeToken(input.actorTag),
  ].join("|");
}

export function isLogThrottleMemoryHit(key: string, nowMs = Date.now()) {
  trimExpiredMemory(nowMs);
  const expiresAtMs = memoryTtlByKey.get(key);
  if (!expiresAtMs) return false;
  return expiresAtMs > nowMs;
}

export function rememberLogThrottleKey(key: string, windowMs: number, nowMs = Date.now()) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) return;
  trimExpiredMemory(nowMs);
  memoryTtlByKey.set(key, nowMs + windowMs);
  trimOverflowMemory();
}

export function __resetB2bLogThrottleMemoryForTest() {
  memoryTtlByKey.clear();
}
