import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

const DEFAULT_DB_POOL_BUSY_RETRY_AFTER_SEC = 20;

export const EMPLOYEE_SYNC_DB_POOL_BUSY_ERROR =
  "서버 요청이 많아 처리 대기 중입니다. 잠시 후 다시 시도해 주세요.";
export const EMPLOYEE_SYNC_EXECUTE_FAILED_ERROR =
  "건강 데이터 동기화 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";

function resolveDbPoolBusyRetryAfterSec() {
  const raw = Number(process.env.B2B_SYNC_DB_POOL_BUSY_RETRY_AFTER_SEC);
  if (!Number.isFinite(raw)) return DEFAULT_DB_POOL_BUSY_RETRY_AFTER_SEC;
  return Math.max(5, Math.min(120, Math.floor(raw)));
}

export function buildDbPoolBusySyncResponse(errorMessage?: string) {
  const retryAfterSec = resolveDbPoolBusyRetryAfterSec();
  const availableAt = new Date(Date.now() + retryAfterSec * 1000).toISOString();
  return noStoreJson(
    {
      ok: false,
      code: "DB_POOL_TIMEOUT",
      reason: "db_pool_busy",
      nextAction: "wait",
      retryAfterSec,
      availableAt,
      error: errorMessage || EMPLOYEE_SYNC_DB_POOL_BUSY_ERROR,
    },
    503
  );
}

export function describeEmployeeSyncError(error: unknown) {
  if (error instanceof Error) {
    const errorCode =
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code?: string }).code ?? null
        : null;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: errorCode,
    };
  }

  return {
    name: typeof error,
    message: String(error),
    stack: undefined,
    code: null,
  };
}

export function resolveEmployeeSyncExecuteFailure(error: unknown) {
  const dbError = resolveDbRouteError(error, EMPLOYEE_SYNC_EXECUTE_FAILED_ERROR);
  return {
    details: describeEmployeeSyncError(error),
    dbError,
    response:
      dbError.code === "DB_POOL_TIMEOUT"
        ? buildDbPoolBusySyncResponse(dbError.message)
        : noStoreJson(
            { ok: false, code: dbError.code, error: dbError.message },
            dbError.status
          ),
  };
}
