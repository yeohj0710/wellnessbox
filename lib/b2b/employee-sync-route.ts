import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  B2B_EMPLOYEE_TOKEN_COOKIE,
  buildB2bEmployeeAccessToken,
  getB2bEmployeeCookieOptions,
} from "@/lib/b2b/employee-token";
import {
  B2bEmployeeSyncError,
  fetchAndStoreB2bHealthSnapshot,
  logB2bEmployeeAccess,
} from "@/lib/b2b/employee-service";
import { ensureLatestB2bReport, regenerateB2bReport } from "@/lib/b2b/report-service";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";
export { noStoreJson };

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

export async function resolveForceRefreshAccess(input: {
  req: Request;
  forceRefreshRequested: boolean;
}) {
  const forceRefreshCooldownSeconds = resolveForceRefreshCooldownSeconds();
  if (!input.forceRefreshRequested) {
    return {
      ok: true as const,
      forceRefreshCooldownSeconds,
    };
  }

  const debugForceRefresh = canBypassForceRefreshAdminWithDebugHeader(input.req);
  const adminAuth = await requireAdminSession();
  const canForceRefresh = debugForceRefresh || adminAuth.ok;
  if (!canForceRefresh) {
    return {
      ok: false as const,
      response: noStoreJson(
        {
          ok: false,
          code: "FORCE_REFRESH_RESTRICTED",
          reason: "force_refresh_restricted",
          nextAction: "retry",
          error: FORCE_REFRESH_RESTRICTED_ERROR,
        },
        403
      ),
      forceRefreshCooldownSeconds,
    };
  }

  return {
    ok: true as const,
    forceRefreshCooldownSeconds,
  };
}

export async function ensureForceRefreshCooldown(input: {
  forceRefreshRequested: boolean;
  lastSyncedAt: Date | null;
  forceRefreshCooldownSeconds: number;
  accessContext: SyncAccessContext;
}) {
  if (!input.forceRefreshRequested) {
    return { ok: true as const };
  }

  const cooldown = computeForceRefreshCooldown(
    input.lastSyncedAt,
    input.forceRefreshCooldownSeconds
  );
  if (cooldown.available) {
    return { ok: true as const };
  }

  await logSyncAccess(input.accessContext, "sync_force_refresh_cooldown", {
    retryAfterSec: cooldown.remainingSeconds,
    availableAt: cooldown.availableAt,
    cooldownSeconds: input.forceRefreshCooldownSeconds,
  });

  return {
    ok: false as const,
    response: noStoreJson(
      {
        ok: false,
        code: "SYNC_COOLDOWN",
        reason: "force_refresh_cooldown",
        nextAction: "wait",
        error: FORCE_REFRESH_COOLDOWN_ERROR,
        retryAfterSec: cooldown.remainingSeconds,
        availableAt: cooldown.availableAt,
        cooldown: buildCooldownPayload(
          input.forceRefreshCooldownSeconds,
          cooldown.remainingSeconds,
          cooldown.availableAt
        ),
      },
      429
    ),
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

export function attachEmployeeToken(
  response: NextResponse,
  employeeId: string,
  identityHash: string
) {
  const token = buildB2bEmployeeAccessToken({
    employeeId,
    identityHash,
  });
  response.cookies.set(
    B2B_EMPLOYEE_TOKEN_COOKIE,
    token,
    getB2bEmployeeCookieOptions()
  );
  return response;
}

export async function logSyncAccess(
  context: SyncAccessContext,
  action: string,
  payload?: Record<string, unknown>
) {
  await logB2bEmployeeAccess({
    employeeId: context.employeeId,
    appUserId: context.appUserId,
    action,
    route: SYNC_ROUTE,
    ip: context.ip,
    userAgent: context.userAgent,
    payload,
  });
}

export function buildSyncSuccessResponse(input: {
  employeeId: string;
  employeeName: string;
  identityHash: string;
  source: string;
  snapshotId: string;
  forceRefresh: boolean;
  cooldownSeconds: number;
  remainingCooldownSeconds: number;
  cooldownAvailableAt: string | null;
  reportId: string;
  reportVariantIndex: number;
  reportStatus: string;
  reportPeriodKey: string;
}) {
  const response = noStoreJson({
    ok: true,
    employee: {
      id: input.employeeId,
      name: input.employeeName,
    },
    sync: {
      source: input.source,
      snapshotId: input.snapshotId,
      forceRefresh: input.forceRefresh,
      cooldown: buildCooldownPayload(
        input.cooldownSeconds,
        input.remainingCooldownSeconds,
        input.cooldownAvailableAt
      ),
    },
    report: {
      id: input.reportId,
      variantIndex: input.reportVariantIndex,
      status: input.reportStatus,
      periodKey: input.reportPeriodKey,
    },
  });

  return attachEmployeeToken(response, input.employeeId, input.identityHash);
}

export async function tryReuseLatestSnapshot(input: {
  employeeId: string;
  employeeName: string;
  identityHash: string;
  requestedPeriodKey: string;
  explicitPeriodKey: string | undefined;
  forceRefreshCooldownSeconds: number;
  accessContext: SyncAccessContext;
}) {
  const latestSnapshot = await db.b2bHealthDataSnapshot.findFirst({
    where: { employeeId: input.employeeId, provider: "HYPHEN_NHIS" },
    orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      periodKey: true,
    },
  });
  if (!latestSnapshot) return null;

  const reusePeriodKey =
    input.explicitPeriodKey ?? latestSnapshot.periodKey ?? input.requestedPeriodKey;
  const report = await ensureLatestB2bReport(input.employeeId, reusePeriodKey);

  const response = buildSyncSuccessResponse({
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    identityHash: input.identityHash,
    source: "snapshot-history",
    snapshotId: latestSnapshot.id,
    forceRefresh: false,
    cooldownSeconds: input.forceRefreshCooldownSeconds,
    remainingCooldownSeconds: 0,
    cooldownAvailableAt: null,
    reportId: report.id,
    reportVariantIndex: report.variantIndex,
    reportStatus: report.status,
    reportPeriodKey: report.periodKey ?? reusePeriodKey,
  });

  await logSyncAccess(input.accessContext, "sync_reused_snapshot", {
    reportId: report.id,
    snapshotId: latestSnapshot.id,
    periodKey: report.periodKey ?? reusePeriodKey,
  });

  return response;
}

export async function executeSyncAndBuildResponse(input: {
  appUserId: string;
  upserted: {
    employee: { id: string; name: string };
    identity: {
      identityHash: string;
      name: string;
      birthDate: string;
      phoneNormalized: string;
    };
  };
  requestedPeriodKey: string;
  forceRefreshRequested: boolean;
  forceRefreshCooldownSeconds: number;
  generateAiEvaluation?: boolean;
  accessContext: SyncAccessContext;
}) {
  try {
    const syncResult = await fetchAndStoreB2bHealthSnapshot({
      appUserId: input.appUserId,
      employeeId: input.upserted.employee.id,
      identity: input.upserted.identity,
      forceRefresh: input.forceRefreshRequested,
    });

    const report = await regenerateB2bReport({
      employeeId: input.upserted.employee.id,
      pageSize: "A4",
      periodKey: input.requestedPeriodKey,
      recomputeAnalysis: true,
      generateAiEvaluation: input.generateAiEvaluation,
    });

    const successCooldown = input.forceRefreshRequested
      ? resolvePostForceRefreshCooldown(input.forceRefreshCooldownSeconds)
      : { remainingSeconds: 0, availableAt: null as string | null };

    const response = buildSyncSuccessResponse({
      employeeId: input.upserted.employee.id,
      employeeName: input.upserted.employee.name,
      identityHash: input.upserted.identity.identityHash,
      source: syncResult.source,
      snapshotId: syncResult.snapshot.id,
      forceRefresh: input.forceRefreshRequested,
      cooldownSeconds: input.forceRefreshCooldownSeconds,
      remainingCooldownSeconds: successCooldown.remainingSeconds,
      cooldownAvailableAt: successCooldown.availableAt,
      reportId: report.id,
      reportVariantIndex: report.variantIndex,
      reportStatus: report.status,
      reportPeriodKey: report.periodKey ?? input.requestedPeriodKey,
    });

    await logSyncAccess(input.accessContext, "sync_success", {
      reportId: report.id,
      source: syncResult.source,
      periodKey: input.requestedPeriodKey,
      forceRefresh: input.forceRefreshRequested,
    });

    return response;
  } catch (error) {
    if (error instanceof B2bEmployeeSyncError) {
      await logSyncAccess(input.accessContext, "sync_blocked", {
        code: error.code,
        reason: error.reason,
        nextAction: error.nextAction,
      });

      return noStoreJson(
        {
          ok: false,
          code: error.code,
          reason: error.reason,
          nextAction: error.nextAction,
          error: error.message,
        },
        error.status
      );
    }

    const dbError = resolveDbRouteError(error, "건강 데이터 동기화에 실패했습니다.");
    await logSyncAccess(input.accessContext, "sync_failed", {
      error: dbError.message,
    });

    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
