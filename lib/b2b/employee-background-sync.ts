import "server-only";

import { randomUUID } from "crypto";
import db from "@/lib/db";
import {
  B2bEmployeeSyncError,
  fetchAndStoreB2bHealthSnapshot,
} from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  ensureLatestB2bReport,
  regenerateB2bReport,
} from "@/lib/b2b/report-service";
import { findLatestEmployeeSyncTimeoutFallbackSnapshot } from "@/lib/b2b/employee-sync-route-query-support";
import { runNhisInitRoute } from "@/lib/server/hyphen/init-route";
import { runNhisSignRoute } from "@/lib/server/hyphen/sign-route";

const INTERNAL_ROUTE_ORIGIN = "https://wellnessbox.internal";
const SIGN_RETRY_DELAY_MS = 12_000;
const INIT_RETRY_DELAY_MS = 5_000;
const FAILURE_RETRY_DELAY_MS = 20_000;
const RUNNER_HEARTBEAT_INTERVAL_MS = 10_000;
const RUNNER_HEARTBEAT_TIMEOUT_MS = 40_000;
const LEGACY_RUNNING_INIT_STALE_MS = 15_000;
const MAX_BACKGROUND_LOOPS_PER_RUN = 20;
const MAX_INLINE_WAIT_MS = 20_000;

export const EMPLOYEE_SYNC_STATE_ACTIVE_STATUSES = [
  "queued",
  "awaiting_sign",
  "running",
] as const;

export type EmployeeSyncStateStatus =
  | "idle"
  | "queued"
  | "awaiting_sign"
  | "running"
  | "completed"
  | "failed";

export type EmployeeSyncStateStep = "init" | "sign" | "fetch" | "report";

type SyncStateRow = Awaited<
  ReturnType<typeof db.b2bEmployeeSyncState.findUnique>
>;

function now() {
  return new Date();
}

function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

async function readJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

function buildJsonRequest(pathname: string, body: Record<string, unknown>) {
  return new Request(`${INTERNAL_ROUTE_ORIGIN}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function isEmployeeSyncStateActive(
  status: string | null | undefined
): status is (typeof EMPLOYEE_SYNC_STATE_ACTIVE_STATUSES)[number] {
  return EMPLOYEE_SYNC_STATE_ACTIVE_STATUSES.includes(
    (status ?? "") as (typeof EMPLOYEE_SYNC_STATE_ACTIVE_STATUSES)[number]
  );
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeEmployeeSyncState(state: SyncStateRow) {
  if (!state) {
    return {
      status: "idle" as const,
      step: null,
      periodKey: resolveCurrentPeriodKey(),
      requestedAt: null,
      startedAt: null,
      lastAttemptAt: null,
      nextRetryAt: null,
      completedAt: null,
      attemptCount: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastResultSource: null,
      lastSnapshotId: null,
      lastReportId: null,
      active: false,
    };
  }

  return {
    status: state.status as EmployeeSyncStateStatus,
    step: (state.step ?? null) as EmployeeSyncStateStep | null,
    periodKey: state.periodKey ?? resolveCurrentPeriodKey(),
    requestedAt: serializeDate(state.requestedAt),
    startedAt: serializeDate(state.startedAt),
    lastAttemptAt: serializeDate(state.lastAttemptAt),
    nextRetryAt: serializeDate(state.nextRetryAt),
    completedAt: serializeDate(state.completedAt),
    attemptCount: state.attemptCount,
    lastErrorCode: state.lastErrorCode ?? null,
    lastErrorMessage: state.lastErrorMessage ?? null,
    lastResultSource: state.lastResultSource ?? null,
    lastSnapshotId: state.lastSnapshotId ?? null,
    lastReportId: state.lastReportId ?? null,
    active: isEmployeeSyncStateActive(state.status),
  };
}

export async function scheduleEmployeeBackgroundSync(input: {
  employeeId: string;
  appUserId: string;
  periodKey?: string | null;
  forceRefresh?: boolean;
}) {
  const requestedAt = now();
  const periodKey = input.periodKey ?? resolveCurrentPeriodKey();
  const forceRefresh = input.forceRefresh === true;

  return db.b2bEmployeeSyncState.upsert({
    where: { employeeId: input.employeeId },
    create: {
      employeeId: input.employeeId,
      appUserId: input.appUserId,
      periodKey,
      status: "queued",
      step: "init",
      forceRefresh,
      requestedAt,
      nextRetryAt: requestedAt,
      attemptCount: 0,
      completedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastResultSource: null,
      lastSnapshotId: null,
      lastReportId: null,
      runnerToken: null,
      runnerHeartbeatAt: null,
    },
    update: {
      appUserId: input.appUserId,
      periodKey,
      status: "queued",
      step: "init",
      forceRefresh,
      requestedAt,
      nextRetryAt: requestedAt,
      completedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      runnerToken: null,
      runnerHeartbeatAt: null,
    },
  });
}

async function claimEmployeeSyncState(employeeId: string) {
  const current = await db.b2bEmployeeSyncState.findUnique({
    where: { employeeId },
  });
  if (!current) return null;

  const currentStatus = current.status as EmployeeSyncStateStatus;
  if (!isEmployeeSyncStateActive(currentStatus)) return null;

  const staleBefore = addMs(now(), -RUNNER_HEARTBEAT_TIMEOUT_MS);
  const legacyRunningInitStaleBefore = addMs(now(), -LEGACY_RUNNING_INIT_STALE_MS);
  const legacyRunningInitLikelyStuck =
    currentStatus === "running" &&
    current.step === "init" &&
    current.lastAttemptAt == null &&
    current.startedAt != null &&
    current.startedAt < legacyRunningInitStaleBefore;
  const runnerAvailable =
    !current.runnerToken ||
    !current.runnerHeartbeatAt ||
    current.runnerHeartbeatAt < staleBefore ||
    legacyRunningInitLikelyStuck;
  if (!runnerAvailable) {
    return null;
  }

  const runnerToken = randomUUID();
  const claimedAt = now();
  const updated = await db.b2bEmployeeSyncState.updateMany({
    where: {
      employeeId,
      updatedAt: current.updatedAt,
    },
    data: {
      runnerToken,
      runnerHeartbeatAt: claimedAt,
      status: currentStatus === "queued" ? "running" : current.status,
      startedAt: current.startedAt ?? claimedAt,
    },
  });
  if (updated.count === 0) return null;

  return {
    runnerToken,
  };
}

async function touchSyncRunner(employeeId: string, runnerToken: string) {
  await db.b2bEmployeeSyncState.updateMany({
    where: {
      employeeId,
      runnerToken,
    },
    data: {
      runnerHeartbeatAt: now(),
    },
  });
}

async function markRunningStep(input: {
  employeeId: string;
  runnerToken: string;
  periodKey: string;
  step: EmployeeSyncStateStep;
}) {
  await db.b2bEmployeeSyncState.update({
    where: { employeeId: input.employeeId },
    data: {
      periodKey: input.periodKey,
      status: "running",
      step: input.step,
      lastAttemptAt: now(),
      nextRetryAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      runnerToken: input.runnerToken,
      runnerHeartbeatAt: now(),
    },
  });
}

async function runWithRunnerHeartbeat<T>(input: {
  employeeId: string;
  runnerToken: string;
  run: () => Promise<T>;
}) {
  const timer = setInterval(() => {
    void touchSyncRunner(input.employeeId, input.runnerToken).catch(() => undefined);
  }, RUNNER_HEARTBEAT_INTERVAL_MS);

  try {
    return await input.run();
  } finally {
    clearInterval(timer);
  }
}

async function releaseSyncRunner(employeeId: string, runnerToken: string) {
  await db.b2bEmployeeSyncState.updateMany({
    where: {
      employeeId,
      runnerToken,
    },
    data: {
      runnerToken: null,
      runnerHeartbeatAt: null,
    },
  });
}

async function markAwaitingSign(input: {
  employeeId: string;
  runnerToken: string;
  periodKey: string;
  retryDelayMs?: number;
  code?: string | null;
  message?: string | null;
}) {
  const nextRetryAt = addMs(now(), input.retryDelayMs ?? SIGN_RETRY_DELAY_MS);
  await db.b2bEmployeeSyncState.update({
    where: { employeeId: input.employeeId },
    data: {
      periodKey: input.periodKey,
      status: "awaiting_sign",
      step: "sign",
      lastAttemptAt: now(),
      nextRetryAt,
      attemptCount: { increment: 1 },
      lastErrorCode: input.code ?? null,
      lastErrorMessage: input.message ?? null,
      runnerToken: input.runnerToken,
      runnerHeartbeatAt: now(),
    },
  });
}

async function markQueuedInit(input: {
  employeeId: string;
  runnerToken: string;
  periodKey: string;
  retryDelayMs?: number;
  code?: string | null;
  message?: string | null;
}) {
  const nextRetryAt = addMs(now(), input.retryDelayMs ?? INIT_RETRY_DELAY_MS);
  await db.b2bEmployeeSyncState.update({
    where: { employeeId: input.employeeId },
    data: {
      periodKey: input.periodKey,
      status: "queued",
      step: "init",
      lastAttemptAt: now(),
      nextRetryAt,
      attemptCount: { increment: 1 },
      lastErrorCode: input.code ?? null,
      lastErrorMessage: input.message ?? null,
      runnerToken: input.runnerToken,
      runnerHeartbeatAt: now(),
    },
  });
}

async function markQueuedFetch(input: {
  employeeId: string;
  runnerToken: string;
  periodKey: string;
}) {
  await db.b2bEmployeeSyncState.update({
    where: { employeeId: input.employeeId },
    data: {
      periodKey: input.periodKey,
      status: "queued",
      step: "fetch",
      lastAttemptAt: now(),
      nextRetryAt: now(),
      lastErrorCode: null,
      lastErrorMessage: null,
      runnerToken: input.runnerToken,
      runnerHeartbeatAt: now(),
    },
  });
}

async function markCompleted(input: {
  employeeId: string;
  runnerToken: string;
  periodKey: string;
  resultSource: string;
  snapshotId?: string | null;
  reportId?: string | null;
}) {
  await db.b2bEmployeeSyncState.update({
    where: { employeeId: input.employeeId },
    data: {
      periodKey: input.periodKey,
      status: "completed",
      step: "report",
      completedAt: now(),
      lastAttemptAt: now(),
      nextRetryAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastResultSource: input.resultSource,
      lastSnapshotId: input.snapshotId ?? null,
      lastReportId: input.reportId ?? null,
      runnerToken: input.runnerToken,
      runnerHeartbeatAt: now(),
    },
  });
}

async function markFailed(input: {
  employeeId: string;
  runnerToken: string;
  periodKey: string;
  code?: string | null;
  message: string;
  retryable?: boolean;
}) {
  const currentTime = now();
  await db.b2bEmployeeSyncState.update({
    where: { employeeId: input.employeeId },
    data: {
      periodKey: input.periodKey,
      status: input.retryable ? "queued" : "failed",
      step: input.retryable ? "init" : null,
      lastAttemptAt: currentTime,
      nextRetryAt: input.retryable
        ? addMs(currentTime, FAILURE_RETRY_DELAY_MS)
        : null,
      attemptCount: { increment: 1 },
      lastErrorCode: input.code ?? null,
      lastErrorMessage: input.message,
      runnerToken: input.runnerToken,
      runnerHeartbeatAt: currentTime,
    },
  });
}

async function attemptInit(input: {
  employeeId: string;
  runnerToken: string;
  appUserId: string;
  periodKey: string;
  identity: {
    name: string;
    birthDate: string;
    phoneNormalized: string;
  };
}) {
  try {
    await markRunningStep({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      step: "init",
    });
    const response = await runWithRunnerHeartbeat({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      run: () =>
        runNhisInitRoute(
          buildJsonRequest("/api/health/nhis/init", {
            loginMethod: "EASY",
            loginOrgCd: "kakao",
            resNm: input.identity.name,
            resNo: input.identity.birthDate,
            mobileNo: input.identity.phoneNormalized,
          }),
          input.appUserId
        ),
    });
    const payload = (await readJsonSafe(response)) as {
      ok?: boolean;
      linked?: boolean;
      nextStep?: string;
      error?: string;
      code?: string;
      nextAction?: string;
    };

    if (response.ok && (payload.linked === true || payload.nextStep === "fetch")) {
      await markQueuedFetch({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
      });
      return { continueNow: true };
    }

    if (response.ok && payload.nextStep === "sign") {
      await markAwaitingSign({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
      });
      return { continueNow: false };
    }

    if (payload.nextAction === "sign") {
      await markAwaitingSign({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
        code: payload.code ?? null,
        message: payload.error ?? null,
      });
      return { continueNow: false };
    }

    await markFailed({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      code: payload.code ?? null,
      message:
        payload.error ?? "건강검진 연동 준비를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
    return { continueNow: false };
  } catch (error) {
    await markFailed({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      message: normalizeErrorMessage(
        error,
        "건강검진 연동 준비 중 알 수 없는 오류가 발생했습니다."
      ),
      retryable: true,
    });
    return { continueNow: false };
  }
}

async function attemptSign(input: {
  employeeId: string;
  runnerToken: string;
  appUserId: string;
  periodKey: string;
}) {
  try {
    await markRunningStep({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      step: "sign",
    });
    const response = await runWithRunnerHeartbeat({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      run: () =>
        runNhisSignRoute({
          req: buildJsonRequest("/api/health/nhis/sign", {}),
          appUserId: input.appUserId,
          signFailureMessage:
            "카카오 인증 확인을 완료하지 못했습니다. 카카오 인증 상태를 확인한 뒤 다시 시도해 주세요.",
        }),
    });
    const payload = (await readJsonSafe(response)) as {
      ok?: boolean;
      linked?: boolean;
      error?: string;
      code?: string;
      nextAction?: string;
      retryAfterSec?: number;
    };

    if (response.ok && payload.linked === true) {
      await markQueuedFetch({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
      });
      return { continueNow: true };
    }

    if (payload.nextAction === "init") {
      await markQueuedInit({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
        code: payload.code ?? null,
        message: payload.error ?? null,
      });
      return { continueNow: false };
    }

    if (payload.nextAction === "sign" || response.status === 429) {
      await markAwaitingSign({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
        retryDelayMs:
          typeof payload.retryAfterSec === "number" && payload.retryAfterSec > 0
            ? payload.retryAfterSec * 1000
            : SIGN_RETRY_DELAY_MS,
        code: payload.code ?? null,
        message: payload.error ?? null,
      });
      return { continueNow: false };
    }

    await markFailed({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      code: payload.code ?? null,
      message:
        payload.error ??
        "카카오 인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
    return { continueNow: false };
  } catch (error) {
    await markFailed({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      message: normalizeErrorMessage(
        error,
        "카카오 인증 확인 중 알 수 없는 오류가 발생했습니다."
      ),
      retryable: true,
    });
    return { continueNow: false };
  }
}

async function attemptFetch(input: {
  employeeId: string;
  runnerToken: string;
  appUserId: string;
  periodKey: string;
  forceRefresh: boolean;
  identity: {
    identityHash: string;
    name: string;
    birthDate: string;
    phoneNormalized: string;
  };
}) {
  try {
    await markRunningStep({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      step: "fetch",
    });
    const syncResult = await runWithRunnerHeartbeat({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      run: () =>
        fetchAndStoreB2bHealthSnapshot({
          appUserId: input.appUserId,
          employeeId: input.employeeId,
          identity: input.identity,
          forceRefresh: input.forceRefresh,
        }),
    });

    const report = await regenerateB2bReport({
      employeeId: input.employeeId,
      pageSize: "A4",
      periodKey: input.periodKey,
      recomputeAnalysis: true,
    });

    await markCompleted({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      resultSource: syncResult.source,
      snapshotId: syncResult.snapshot.id,
      reportId: report.id,
    });
    return { continueNow: false };
  } catch (error) {
    if (error instanceof B2bEmployeeSyncError) {
      if (error.reason === "nhis_init_required" || error.reason === "nhis_auth_expired") {
        await markQueuedInit({
          employeeId: input.employeeId,
          runnerToken: input.runnerToken,
          periodKey: input.periodKey,
          code: error.code,
          message: error.message,
        });
        return { continueNow: false };
      }

      if (error.reason === "nhis_sign_required") {
        await markAwaitingSign({
          employeeId: input.employeeId,
          runnerToken: input.runnerToken,
          periodKey: input.periodKey,
          code: error.code,
          message: error.message,
        });
        return { continueNow: false };
      }

      if (error.reason === "hyphen_fetch_timeout") {
        const fallbackSnapshot = await findLatestEmployeeSyncTimeoutFallbackSnapshot(
          input.employeeId
        );
        if (fallbackSnapshot) {
          const report = await ensureLatestB2bReport(input.employeeId, input.periodKey);
          await markCompleted({
            employeeId: input.employeeId,
            runnerToken: input.runnerToken,
            periodKey: input.periodKey,
            resultSource: "snapshot-history",
            snapshotId: fallbackSnapshot.id,
            reportId: report.id,
          });
          return { continueNow: false };
        }
      }

      await markFailed({
        employeeId: input.employeeId,
        runnerToken: input.runnerToken,
        periodKey: input.periodKey,
        code: error.code,
        message: error.message,
      });
      return { continueNow: false };
    }

    await markFailed({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey: input.periodKey,
      message: normalizeErrorMessage(
        error,
        "건강 데이터 연동 중 알 수 없는 오류가 발생했습니다."
      ),
      retryable: true,
    });
    return { continueNow: false };
  }
}

async function runSingleEmployeeSyncAttempt(input: {
  employeeId: string;
  runnerToken: string;
}) {
  const state = await db.b2bEmployeeSyncState.findUnique({
    where: { employeeId: input.employeeId },
  });
  if (!state || state.runnerToken !== input.runnerToken) {
    return { continueNow: false };
  }

  const periodKey = state.periodKey ?? resolveCurrentPeriodKey();
  const employee = await db.b2bEmployee.findUnique({
    where: { id: input.employeeId },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
    },
  });
  if (!employee?.appUserId) {
    await markFailed({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      periodKey,
      message: "직원 계정이 연결되지 않아 건강 데이터를 연동할 수 없습니다.",
    });
    return { continueNow: false };
  }

  const nextRetryAt = state.nextRetryAt;
  if (nextRetryAt && nextRetryAt > now() && state.status !== "running") {
    return { continueNow: false };
  }

  await touchSyncRunner(input.employeeId, input.runnerToken);

  const step = (state.step ?? "init") as EmployeeSyncStateStep;
  if (step === "sign" || state.status === "awaiting_sign") {
    return attemptSign({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      appUserId: employee.appUserId,
      periodKey,
    });
  }
  if (step === "fetch") {
    return attemptFetch({
      employeeId: input.employeeId,
      runnerToken: input.runnerToken,
      appUserId: employee.appUserId,
      periodKey,
      forceRefresh: state.forceRefresh,
      identity: {
        identityHash: employee.identityHash,
        name: employee.name,
        birthDate: employee.birthDate,
        phoneNormalized: employee.phoneNormalized,
      },
    });
  }
  return attemptInit({
    employeeId: input.employeeId,
    runnerToken: input.runnerToken,
    appUserId: employee.appUserId,
    periodKey,
    identity: {
      name: employee.name,
      birthDate: employee.birthDate,
      phoneNormalized: employee.phoneNormalized,
    },
  });
}

export async function processEmployeeBackgroundSyncState(employeeId: string) {
  const claim = await claimEmployeeSyncState(employeeId);
  if (!claim) return false;

  try {
    for (let index = 0; index < MAX_BACKGROUND_LOOPS_PER_RUN; index += 1) {
      const state = await db.b2bEmployeeSyncState.findUnique({
        where: { employeeId },
        select: {
          status: true,
          nextRetryAt: true,
        },
      });
      if (!state || !isEmployeeSyncStateActive(state.status)) break;

      const nextRetryAt = state.nextRetryAt;
      if (nextRetryAt && nextRetryAt > now()) {
        const waitMs = nextRetryAt.getTime() - Date.now();
        if (waitMs > MAX_INLINE_WAIT_MS) break;
        await sleep(Math.max(200, waitMs));
        continue;
      }

      const attempt = await runSingleEmployeeSyncAttempt({
        employeeId,
        runnerToken: claim.runnerToken,
      });
      if (!attempt.continueNow) {
        const refreshed = await db.b2bEmployeeSyncState.findUnique({
          where: { employeeId },
          select: {
            status: true,
            nextRetryAt: true,
          },
        });
        if (!refreshed || !isEmployeeSyncStateActive(refreshed.status)) break;
        const retryAt = refreshed.nextRetryAt;
        if (!retryAt) break;
        const waitMs = retryAt.getTime() - Date.now();
        if (waitMs > MAX_INLINE_WAIT_MS) break;
        await sleep(Math.max(200, waitMs));
        continue;
      }
      await sleep(250);
    }
    return true;
  } finally {
    await releaseSyncRunner(employeeId, claim.runnerToken);
  }
}

export async function processDueEmployeeBackgroundSyncStates(input?: {
  take?: number;
}) {
  const rows = await db.b2bEmployeeSyncState.findMany({
    where: {
      status: {
        in: [...EMPLOYEE_SYNC_STATE_ACTIVE_STATUSES],
      },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now() } }],
    },
    orderBy: [{ updatedAt: "asc" }],
    take: input?.take ?? 4,
    select: { employeeId: true },
  });

  for (const row of rows) {
    await processEmployeeBackgroundSyncState(row.employeeId).catch((error) => {
      console.error("[b2b][employee-sync-state] background process failed", {
        employeeId: row.employeeId,
        message: normalizeErrorMessage(error, "unknown_background_sync_error"),
      });
    });
  }

  return rows.length;
}

export function scheduleEmployeeBackgroundSyncAfterResponse(employeeId: string) {
  const run = async () => {
    await processEmployeeBackgroundSyncState(employeeId).catch((error) => {
      console.error("[b2b][employee-sync-state] after-response process failed", {
        employeeId,
        message: normalizeErrorMessage(error, "unknown_after_response_sync_error"),
      });
    });
  };

  // Run outside the request body via timer. Cron remains the durable fallback
  // for retries and environments where this immediate kick does not finish.
  setTimeout(() => {
    void run();
  }, 0);
}

export async function nudgeEmployeeAwaitingSignSyncNow(employeeId: string) {
  await db.b2bEmployeeSyncState
    .updateMany({
      where: {
        employeeId,
        OR: [{ status: "awaiting_sign" }, { step: "sign" }],
      },
      data: {
        nextRetryAt: now(),
      },
    })
    .catch(() => undefined);
}
