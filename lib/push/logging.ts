import { performance } from "node:perf_hooks";

type PushLogMeta = Record<string, unknown>;

const shouldLogPush = () =>
  process.env.WB_PUSH_LOGGING === "0"
    ? false
    : process.env.WB_PUSH_LOGGING === "1" ||
      process.env.NODE_ENV !== "production";

function cleanMeta(meta: PushLogMeta | undefined): PushLogMeta | undefined {
  if (!meta) return undefined;
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function startPushTimer() {
  return performance.now();
}

export function elapsedPushMs(startedAt: number) {
  return Number((performance.now() - startedAt).toFixed(1));
}

export function pushLog(message: string, meta?: PushLogMeta) {
  if (!shouldLogPush()) return;
  const payload = cleanMeta(meta);
  if (payload) {
    console.info(`[push] ${message}`, payload);
    return;
  }
  console.info(`[push] ${message}`);
}

export function pushErrorMeta(error: unknown): PushLogMeta {
  if (!error || typeof error !== "object") {
    return { errorType: typeof error, errorMessage: String(error) };
  }
  const err = error as {
    name?: string;
    message?: string;
    code?: unknown;
    statusCode?: unknown;
    status?: unknown;
  };
  return {
    errorType: err.name ?? "Error",
    errorMessage: err.message ?? String(error),
    errorCode: err.code ?? null,
    errorStatusCode: err.statusCode ?? err.status ?? null,
  };
}
