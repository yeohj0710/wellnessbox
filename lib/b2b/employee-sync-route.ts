import db from "@/lib/db";
import {
  B2bEmployeeSyncError,
  fetchAndStoreB2bHealthSnapshot,
  logB2bEmployeeAccess,
} from "@/lib/b2b/employee-service";
import {
  FORCE_REFRESH_COOLDOWN_ERROR,
  FORCE_REFRESH_RESTRICTED_ERROR,
  SYNC_ROUTE,
  buildCooldownPayload,
  canBypassForceRefreshAdminWithDebugHeader,
  computeForceRefreshCooldown,
  readClientIp,
  resolveForceRefreshCooldownSeconds,
  resolvePostForceRefreshCooldown,
  type ForceRefreshCooldown,
  type SyncAccessContext,
} from "@/lib/b2b/employee-sync-core";
import {
  attachEmployeeToken,
  buildSyncSuccessResponse,
} from "@/lib/b2b/employee-sync-response";
import { ensureLatestB2bReport, regenerateB2bReport } from "@/lib/b2b/report-service";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

export {
  attachEmployeeToken,
  buildCooldownPayload,
  buildSyncSuccessResponse,
  canBypassForceRefreshAdminWithDebugHeader,
  computeForceRefreshCooldown,
  readClientIp,
  resolveForceRefreshCooldownSeconds,
  resolvePostForceRefreshCooldown,
  type ForceRefreshCooldown,
  type SyncAccessContext,
};
export { noStoreJson };

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

    const dbError = resolveDbRouteError(
      error,
      "\uAC74\uAC15 \uB370\uC774\uD130 \uB3D9\uAE30\uD654 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
    );
    await logSyncAccess(input.accessContext, "sync_failed", {
      error: dbError.message,
    });

    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
