import { upsertB2bEmployee } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  buildEmployeeSyncDedupKey,
  buildEmployeeSyncRouteFailureResponse,
  buildEmployeeSyncValidationErrorResponse,
  type EmployeeSyncPayload,
} from "@/lib/b2b/employee-sync-route-handler-support";
import {
  ensureForceRefreshCooldown,
  executeSyncAndBuildResponse,
  logSyncAccess,
  readClientIp,
  resolveForceRefreshAccess,
  tryReuseLatestSnapshot,
  type SyncAccessContext,
} from "@/lib/b2b/employee-sync-route";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";
import { requireNhisSession } from "@/lib/server/route-auth";

export async function runEmployeeSyncPostRoute(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;

  return runEmployeeSyncAuthedPostRoute({
    req,
    appUserId: auth.data.appUserId,
    guest: auth.data.guest,
  });
}

export async function runEmployeeSyncAuthedPostRoute(input: {
  req: Request;
  appUserId: string;
  guest: boolean;
}) {
  try {
    const body = await input.req.json().catch(() => null);
    const validated = buildEmployeeSyncValidationErrorResponse(body);
    if (!validated.ok) {
      return validated.response;
    }

    const dedupKey = buildEmployeeSyncDedupKey({
      appUserId: input.appUserId,
      guest: input.guest,
      payload: validated.payload,
    });
    return runWithHyphenInFlightDedup("b2b-employee-sync", dedupKey, () =>
      runEmployeeSyncFlow({
        req: input.req,
        appUserId: input.appUserId,
        guest: input.guest,
        payload: validated.payload,
      })
    );
  } catch (error) {
    return buildEmployeeSyncRouteFailureResponse({
      error,
      appUserId: input.appUserId,
      guest: input.guest,
    });
  }
}

export async function runEmployeeSyncFlow(input: {
  req: Request;
  appUserId: string;
  guest: boolean;
  payload: EmployeeSyncPayload;
}) {
  const forceRefreshRequested = input.payload.forceRefresh === true;
  const forceRefreshAccess = await resolveForceRefreshAccess({
    req: input.req,
    forceRefreshRequested,
  });
  if (!forceRefreshAccess.ok) return forceRefreshAccess.response;

  const forceRefreshCooldownSeconds = forceRefreshAccess.forceRefreshCooldownSeconds;
  const requestedPeriodKey = input.payload.periodKey ?? resolveCurrentPeriodKey();

  const upserted = await upsertB2bEmployee({
    appUserId: input.appUserId,
    name: input.payload.name,
    birthDate: input.payload.birthDate,
    phone: input.payload.phone,
  });

  const accessContext: SyncAccessContext = {
    employeeId: upserted.employee.id,
    appUserId: input.appUserId,
    ip: readClientIp(input.req),
    userAgent: input.req.headers.get("user-agent"),
  };
  void logSyncAccess(accessContext, "sync_start", { guest: input.guest });

  if (!forceRefreshRequested) {
    const reusedResponse = await tryReuseLatestSnapshot({
      employeeId: upserted.employee.id,
      employeeName: upserted.employee.name,
      identityHash: upserted.identity.identityHash,
      requestedPeriodKey,
      explicitPeriodKey: input.payload.periodKey,
      forceRefreshCooldownSeconds,
      accessContext,
    });
    if (reusedResponse) return reusedResponse;
  }

  const cooldownCheck = await ensureForceRefreshCooldown({
    forceRefreshRequested,
    lastSyncedAt: upserted.employee.lastSyncedAt,
    forceRefreshCooldownSeconds,
    accessContext,
  });
  if (!cooldownCheck.ok) return cooldownCheck.response;

  return executeSyncAndBuildResponse({
    appUserId: input.appUserId,
    upserted: {
      employee: {
        id: upserted.employee.id,
        name: upserted.employee.name,
      },
      identity: upserted.identity,
    },
    requestedPeriodKey,
    forceRefreshRequested,
    forceRefreshCooldownSeconds,
    generateAiEvaluation: input.payload.generateAiEvaluation === true,
    accessContext,
  });
}
