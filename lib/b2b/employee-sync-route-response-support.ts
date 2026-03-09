import type { BuildSyncSuccessResponseInput } from "@/lib/b2b/employee-sync-response";
import { buildSyncSuccessResponse } from "@/lib/b2b/employee-sync-response";
import type { B2bEmployeeSyncError } from "@/lib/b2b/employee-service";
import { resolvePostForceRefreshCooldown } from "@/lib/b2b/employee-sync-core";
import { noStoreJson } from "@/lib/server/no-store";

function resolveSuccessCooldown(
  forceRefresh: boolean,
  cooldownSeconds: number
) {
  return forceRefresh
    ? resolvePostForceRefreshCooldown(cooldownSeconds)
    : { remainingSeconds: 0, availableAt: null as string | null };
}

export type BuildEmployeeSyncSuccessResponseInput = {
  employeeId: string;
  employeeName: string;
  identityHash: string;
  source: BuildSyncSuccessResponseInput["source"];
  networkFetched: BuildSyncSuccessResponseInput["networkFetched"];
  snapshotId: string;
  forceRefresh: boolean;
  cooldownSeconds: number;
  reportId: string;
  reportVariantIndex: number;
  reportStatus: string;
  reportPeriodKey: string;
};

export function buildEmployeeSyncSuccessResponse(
  input: BuildEmployeeSyncSuccessResponseInput
) {
  const successCooldown = resolveSuccessCooldown(
    input.forceRefresh,
    input.cooldownSeconds
  );

  return buildSyncSuccessResponse({
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    identityHash: input.identityHash,
    source: input.source,
    networkFetched: input.networkFetched,
    snapshotId: input.snapshotId,
    forceRefresh: input.forceRefresh,
    cooldownSeconds: input.cooldownSeconds,
    remainingCooldownSeconds: successCooldown.remainingSeconds,
    cooldownAvailableAt: successCooldown.availableAt,
    reportId: input.reportId,
    reportVariantIndex: input.reportVariantIndex,
    reportStatus: input.reportStatus,
    reportPeriodKey: input.reportPeriodKey,
  });
}

export function buildEmployeeSyncBlockedResponse(error: B2bEmployeeSyncError) {
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
