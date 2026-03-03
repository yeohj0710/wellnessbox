const DEFAULT_BEST_EFFORT_WRITE_TIMEOUT_MS = 1200;
const DEFAULT_POOL_SHED_WINDOW_MS = 30_000;
const DEFAULT_SHED_WARN_INTERVAL_MS = 10_000;

type BestEffortWriteReason = "ok" | "shed" | "timeout" | "error";

export type BestEffortDbWriteResult = {
  ok: boolean;
  skipped: boolean;
  reason: BestEffortWriteReason;
  errorMessage?: string;
};

let shedUntilMs = 0;
let lastWarnAtMs = 0;

function envPositiveInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  return Math.min(max, Math.max(min, rounded));
}

function resolveWriteTimeoutMs() {
  return envPositiveInt(
    "WB_BEST_EFFORT_DB_WRITE_TIMEOUT_MS",
    DEFAULT_BEST_EFFORT_WRITE_TIMEOUT_MS,
    100,
    10_000
  );
}

function resolvePoolShedWindowMs() {
  return envPositiveInt(
    "WB_DB_POOL_SHED_WINDOW_MS",
    DEFAULT_POOL_SHED_WINDOW_MS,
    1_000,
    120_000
  );
}

function resolveShedWarnIntervalMs() {
  return envPositiveInt(
    "WB_DB_POOL_SHED_WARN_INTERVAL_MS",
    DEFAULT_SHED_WARN_INTERVAL_MS,
    1_000,
    60_000
  );
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function isWriteTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    error.name === "BestEffortDbWriteTimeoutError"
  );
}

export function isPrismaPoolTimeoutError(error: unknown) {
  const message = normalizeErrorMessage(error).toLowerCase();
  if (!message) return false;
  return (
    message.includes("timed out fetching a new connection from the connection pool") ||
    message.includes("connection pool timeout") ||
    message.includes("unable to fetch a connection from the pool")
  );
}

export function isDbPoolShedActive(nowMs = Date.now()) {
  return nowMs < shedUntilMs;
}

function maybeWarnShed(label: string, message: string, nowMs = Date.now()) {
  if (nowMs - lastWarnAtMs < resolveShedWarnIntervalMs()) return;
  lastWarnAtMs = nowMs;
  console.warn("[db][best-effort] shed mode", {
    label,
    shedForMs: Math.max(0, shedUntilMs - nowMs),
    reason: message,
  });
}

function activateShed(label: string, reason: string, nowMs = Date.now()) {
  shedUntilMs = Math.max(shedUntilMs, nowMs + resolvePoolShedWindowMs());
  maybeWarnShed(label, reason, nowMs);
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return task;

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const timeoutError = new Error(
        `best-effort db write timed out after ${timeoutMs}ms`
      );
      timeoutError.name = "BestEffortDbWriteTimeoutError";
      reject(timeoutError);
    }, timeoutMs);
  });

  return Promise.race([task, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function runBestEffortDbWrite(input: {
  label: string;
  task: () => Promise<unknown>;
  timeoutMs?: number;
  skipIfShed?: boolean;
}): Promise<BestEffortDbWriteResult> {
  const nowMs = Date.now();
  const skipIfShed = input.skipIfShed !== false;
  if (skipIfShed && isDbPoolShedActive(nowMs)) {
    return {
      ok: false,
      skipped: true,
      reason: "shed",
    };
  }

  const timeoutMs = input.timeoutMs ?? resolveWriteTimeoutMs();
  try {
    await withTimeout(input.task(), timeoutMs);
    return {
      ok: true,
      skipped: false,
      reason: "ok",
    };
  } catch (error) {
    const errorMessage = normalizeErrorMessage(error);
    const timeout = isWriteTimeoutError(error);
    const poolTimeout = isPrismaPoolTimeoutError(error);
    if (timeout || poolTimeout) {
      activateShed(input.label, timeout ? "timeout" : "pool-timeout");
    } else {
      console.warn("[db][best-effort] write failed", {
        label: input.label,
        error: errorMessage,
      });
    }
    return {
      ok: false,
      skipped: false,
      reason: timeout ? "timeout" : "error",
      errorMessage,
    };
  }
}

export function __resetDbPoolShedStateForTest() {
  shedUntilMs = 0;
  lastWarnAtMs = 0;
}
