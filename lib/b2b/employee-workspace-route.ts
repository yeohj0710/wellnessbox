import "server-only";

import { z } from "zod";
import db from "@/lib/db";
import { upsertB2bEmployee } from "@/lib/b2b/employee-service";
import { attachB2bEmployeeSessionToken } from "@/lib/b2b/employee-session-route";
import {
  scheduleEmployeeBackgroundSync,
  scheduleEmployeeBackgroundSyncAfterResponse,
  isEmployeeSyncStateActive,
  nudgeEmployeeAwaitingSignSyncNow,
  processEmployeeBackgroundSyncState,
} from "@/lib/b2b/employee-background-sync";
import { loadEmployeeWorkspace } from "@/lib/b2b/employee-workspace-service";
import { resolveCurrentPeriodKey, B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";
import { noStoreJson } from "@/lib/server/no-store";
import {
  requireB2bEmployeeToken,
  requireNhisSession,
} from "@/lib/server/route-auth";

const employeeWorkspacePostSchema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: z.string().trim().regex(/^\d{8}$/),
  phone: z.string().trim().regex(/^\d{10,11}$/),
  periodKey: z.string().trim().regex(B2B_PERIOD_KEY_REGEX).optional(),
  restartHealth: z.boolean().optional().default(false),
});

const EMPLOYEE_WORKSPACE_NOT_FOUND_ERROR =
  "직원 정보를 찾을 수 없습니다.";
const EMPLOYEE_WORKSPACE_INVALID_INPUT_ERROR =
  "입력값을 다시 확인해 주세요.";

export async function runEmployeeWorkspaceGetRoute(req: Request) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const driveSync = searchParams.get("driveSync") === "1";
  let workspace = await loadEmployeeWorkspace({
    employeeId: auth.data.employeeId,
    reportId: searchParams.get("reportId"),
    periodKey: searchParams.get("period"),
  });

  if (!workspace) {
    return noStoreJson(
      { ok: false, error: EMPLOYEE_WORKSPACE_NOT_FOUND_ERROR },
      404
    );
  }

  void db.b2bEmployee
    .update({
      where: { id: auth.data.employeeId },
      data: { lastViewedAt: new Date() },
    })
    .catch(() => undefined);

  if (isEmployeeSyncStateActive(workspace.sync.status)) {
    if (workspace.sync.status === "awaiting_sign" || workspace.sync.step === "sign") {
      await nudgeEmployeeAwaitingSignSyncNow(auth.data.employeeId);
    }
    if (driveSync) {
      await processEmployeeBackgroundSyncState(auth.data.employeeId);
      const refreshedWorkspace = await loadEmployeeWorkspace({
        employeeId: auth.data.employeeId,
        reportId: searchParams.get("reportId"),
        periodKey: searchParams.get("period"),
      });
      if (refreshedWorkspace) {
        workspace = refreshedWorkspace;
      }
    }
  }

  if (isEmployeeSyncStateActive(workspace.sync.status)) {
    scheduleEmployeeBackgroundSyncAfterResponse(auth.data.employeeId);
  }

  return noStoreJson({
    ok: true,
    ...workspace,
  });
}

export async function runEmployeeWorkspacePostRoute(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = employeeWorkspacePostSchema.safeParse(raw);
  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          EMPLOYEE_WORKSPACE_INVALID_INPUT_ERROR,
      },
      400
    );
  }

  const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
  const upserted = await upsertB2bEmployee({
    appUserId: auth.data.appUserId,
    name: parsed.data.name,
    birthDate: parsed.data.birthDate,
    phone: parsed.data.phone,
  });

  const existingCurrentHealth = await db.b2bHealthDataSnapshot.findFirst({
    where: {
      employeeId: upserted.employee.id,
      periodKey,
    },
    orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  const shouldScheduleHealthSync =
    parsed.data.restartHealth === true || !existingCurrentHealth;
  if (shouldScheduleHealthSync) {
    await scheduleEmployeeBackgroundSync({
      employeeId: upserted.employee.id,
      appUserId: auth.data.appUserId,
      periodKey,
      forceRefresh: true,
    });
    scheduleEmployeeBackgroundSyncAfterResponse(upserted.employee.id);
  }

  const workspace = await loadEmployeeWorkspace({
    employeeId: upserted.employee.id,
    periodKey,
  });
  if (!workspace) {
    return noStoreJson(
      { ok: false, error: EMPLOYEE_WORKSPACE_NOT_FOUND_ERROR },
      404
    );
  }

  const response = noStoreJson({
    ok: true,
    scheduledHealthSync: shouldScheduleHealthSync,
    ...workspace,
  });
  attachB2bEmployeeSessionToken(
    response,
    upserted.employee.id,
    upserted.identity.identityHash
  );
  return response;
}
