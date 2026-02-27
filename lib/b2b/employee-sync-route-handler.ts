import { z } from "zod";
import { upsertB2bEmployee } from "@/lib/b2b/employee-service";
import { b2bEmployeeIdentityInputSchema } from "@/lib/b2b/employee-route-schema";
import { B2B_PERIOD_KEY_REGEX, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  ensureForceRefreshCooldown,
  executeSyncAndBuildResponse,
  logSyncAccess,
  readClientIp,
  resolveForceRefreshAccess,
  tryReuseLatestSnapshot,
  type SyncAccessContext,
} from "@/lib/b2b/employee-sync-route";
import { noStoreJson } from "@/lib/b2b/employee-sync-route";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { requireNhisSession } from "@/lib/server/route-auth";

export const employeeSyncRequestSchema = b2bEmployeeIdentityInputSchema.extend({
  forceRefresh: z.boolean().optional(),
  periodKey: z.string().regex(B2B_PERIOD_KEY_REGEX).optional(),
  generateAiEvaluation: z.boolean().optional(),
});

export type EmployeeSyncPayload = z.infer<typeof employeeSyncRequestSchema>;

const INPUT_INVALID_ERROR =
  "\uC785\uB825\uAC12\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const SYNC_FAILED_ERROR =
  "\uAC74\uAC15 \uB370\uC774\uD130 \uB3D9\uAE30\uD654 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

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
    const parsed = employeeSyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        { ok: false, error: parsed.error.issues[0]?.message || INPUT_INVALID_ERROR },
        400
      );
    }

    return runEmployeeSyncFlow({
      req: input.req,
      appUserId: input.appUserId,
      guest: input.guest,
      payload: parsed.data,
    });
  } catch (error) {
    const dbError = resolveDbRouteError(error, SYNC_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
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
  await logSyncAccess(accessContext, "sync_start", { guest: input.guest });

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
    generateAiEvaluation: input.payload.generateAiEvaluation,
    accessContext,
  });
}
