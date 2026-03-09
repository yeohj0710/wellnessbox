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
import {
  buildEmployeeSyncBlockedResponse,
  buildEmployeeSyncSuccessResponse,
} from "@/lib/b2b/employee-sync-route-response-support";
import {
  buildDbPoolBusySyncResponse,
  describeEmployeeSyncError,
  resolveEmployeeSyncExecuteFailure,
} from "@/lib/b2b/employee-sync-route-failure-support";
import {
  findLatestEmployeeSyncReusableSnapshot,
  findLatestEmployeeSyncTimeoutFallbackSnapshot,
} from "@/lib/b2b/employee-sync-route-query-support";
import { ensureLatestB2bReport, regenerateB2bReport } from "@/lib/b2b/report-service";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

export {
  attachEmployeeToken,
  buildDbPoolBusySyncResponse,
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

// DB busy payload keeps nextAction: "wait" in employee-sync-route-failure-support.ts.

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

  void logSyncAccess(input.accessContext, "sync_force_refresh_cooldown", {
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
  try {
    await logB2bEmployeeAccess({
      employeeId: context.employeeId,
      appUserId: context.appUserId,
      action,
      route: SYNC_ROUTE,
      ip: context.ip,
      userAgent: context.userAgent,
      payload,
    });
  } catch (error) {
    const details = describeEmployeeSyncError(error);
    console.error("[b2b][employee-sync] access log failed", {
      employeeId: context.employeeId,
      appUserId: context.appUserId,
      action,
      errorName: details.name,
      errorCode: details.code,
      errorMessage: details.message,
    });
  }
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
  const latestSnapshot = await findLatestEmployeeSyncReusableSnapshot(
    input.employeeId
  );
  if (!latestSnapshot) return null;

  const reusePeriodKey =
    input.explicitPeriodKey ?? latestSnapshot.periodKey ?? input.requestedPeriodKey;
  const report = await ensureLatestB2bReport(input.employeeId, reusePeriodKey);

  const response = buildEmployeeSyncSuccessResponse({
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    identityHash: input.identityHash,
    source: "snapshot-history",
    networkFetched: false,
    snapshotId: latestSnapshot.id,
    forceRefresh: false,
    cooldownSeconds: input.forceRefreshCooldownSeconds,
    reportId: report.id,
    reportVariantIndex: report.variantIndex,
    reportStatus: report.status,
    reportPeriodKey: report.periodKey ?? reusePeriodKey,
  });

  void logSyncAccess(input.accessContext, "sync_reused_snapshot", {
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

    const response = buildEmployeeSyncSuccessResponse({
      employeeId: input.upserted.employee.id,
      employeeName: input.upserted.employee.name,
      identityHash: input.upserted.identity.identityHash,
      source: syncResult.source,
      networkFetched: syncResult.source === "fresh",
      snapshotId: syncResult.snapshot.id,
      forceRefresh: input.forceRefreshRequested,
      cooldownSeconds: input.forceRefreshCooldownSeconds,
      reportId: report.id,
      reportVariantIndex: report.variantIndex,
      reportStatus: report.status,
      reportPeriodKey: report.periodKey ?? input.requestedPeriodKey,
    });

    void logSyncAccess(input.accessContext, "sync_success", {
      reportId: report.id,
      source: syncResult.source,
      periodKey: input.requestedPeriodKey,
      forceRefresh: input.forceRefreshRequested,
    });

    return response;
  } catch (error) {
    if (error instanceof B2bEmployeeSyncError) {
      if (error.reason === "hyphen_fetch_timeout") {
        const latestSnapshot = await findLatestEmployeeSyncTimeoutFallbackSnapshot(
          input.upserted.employee.id
        );
        if (latestSnapshot) {
          const report = await ensureLatestB2bReport(
            input.upserted.employee.id,
            input.requestedPeriodKey
          );

          void logSyncAccess(input.accessContext, "sync_timeout_reused_snapshot", {
            code: error.code,
            reason: error.reason,
            reportId: report.id,
            snapshotId: latestSnapshot.id,
            periodKey: report.periodKey ?? input.requestedPeriodKey,
            forceRefresh: input.forceRefreshRequested,
          });

          return buildEmployeeSyncSuccessResponse({
            employeeId: input.upserted.employee.id,
            employeeName: input.upserted.employee.name,
            identityHash: input.upserted.identity.identityHash,
            source: "snapshot-history",
            networkFetched: false,
            snapshotId: latestSnapshot.id,
            forceRefresh: input.forceRefreshRequested,
            cooldownSeconds: input.forceRefreshCooldownSeconds,
            reportId: report.id,
            reportVariantIndex: report.variantIndex,
            reportStatus: report.status,
            reportPeriodKey: report.periodKey ?? input.requestedPeriodKey,
          });
        }
      }

      void logSyncAccess(input.accessContext, "sync_blocked", {
        code: error.code,
        reason: error.reason,
        nextAction: error.nextAction,
      });

      return buildEmployeeSyncBlockedResponse(error);
    }

    const failure = resolveEmployeeSyncExecuteFailure(error);
    const { dbError, details, response } = failure;
    console.error("[b2b][employee-sync] execute sync failed", {
      employeeId: input.upserted.employee.id,
      appUserId: input.appUserId,
      periodKey: input.requestedPeriodKey,
      forceRefresh: input.forceRefreshRequested,
      errorName: details.name,
      errorCode: details.code,
      errorMessage: details.message,
      mappedCode: dbError.code,
      mappedStatus: dbError.status,
    });
    void logSyncAccess(input.accessContext, "sync_failed", {
      error: dbError.message,
      code: dbError.code,
    });

    return response;
  }
}
