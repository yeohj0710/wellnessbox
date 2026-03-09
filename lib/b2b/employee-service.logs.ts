import "server-only";

import { createHash } from "crypto";
import db from "@/lib/db";
import {
  buildAdminActionThrottleKey,
  buildEmployeeAccessThrottleKey,
  isLogThrottleMemoryHit,
  rememberLogThrottleKey,
  resolveAdminActionLogThrottleMs,
  resolveEmployeeAccessLogThrottleMs,
} from "@/lib/b2b/log-throttle";
import { asJsonValue } from "@/lib/b2b/employee-sync-snapshot";
import { runBestEffortDbWrite } from "@/lib/server/db-resilience";

function normalizeIp(value: string | null | undefined) {
  if (!value) return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function hashIp(value: string | null | undefined) {
  const normalized = normalizeIp(value);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

async function shouldSkipEmployeeAccessLogWrite(input: {
  employeeId?: string | null;
  appUserId?: string | null;
  action: string;
  route?: string | null;
  throttleKey: string;
  throttleMs: number;
}) {
  if (input.throttleMs <= 0) return false;
  const nowMs = Date.now();
  if (isLogThrottleMemoryHit(input.throttleKey, nowMs)) return true;
  const windowStart = new Date(nowMs - input.throttleMs);

  try {
    const recent = await db.b2bEmployeeAccessLog.findFirst({
      where: {
        employeeId: input.employeeId ?? null,
        appUserId: input.appUserId ?? null,
        action: input.action,
        route: input.route ?? null,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!recent) return false;
    rememberLogThrottleKey(input.throttleKey, input.throttleMs, nowMs);
    return true;
  } catch (error) {
    console.warn("[b2b][log-throttle] employee access dedupe check failed", {
      action: input.action,
      route: input.route ?? null,
      employeeId: input.employeeId ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

async function shouldSkipAdminActionLogWrite(input: {
  employeeId?: string | null;
  action: string;
  actorTag?: string | null;
  throttleKey: string;
  throttleMs: number;
}) {
  if (input.throttleMs <= 0) return false;
  const nowMs = Date.now();
  if (isLogThrottleMemoryHit(input.throttleKey, nowMs)) return true;
  const windowStart = new Date(nowMs - input.throttleMs);

  try {
    const recent = await db.b2bAdminActionLog.findFirst({
      where: {
        employeeId: input.employeeId ?? null,
        action: input.action,
        actorTag: input.actorTag ?? null,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!recent) return false;
    rememberLogThrottleKey(input.throttleKey, input.throttleMs, nowMs);
    return true;
  } catch (error) {
    console.warn("[b2b][log-throttle] admin action dedupe check failed", {
      action: input.action,
      employeeId: input.employeeId ?? null,
      actorTag: input.actorTag ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

export async function logB2bEmployeeAccess(input: {
  employeeId?: string | null;
  appUserId?: string | null;
  action: string;
  route?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: unknown;
}) {
  const action = input.action.trim();
  const route = input.route ?? null;
  const throttleMs = resolveEmployeeAccessLogThrottleMs(action);
  const throttleKey = buildEmployeeAccessThrottleKey({
    employeeId: input.employeeId ?? null,
    appUserId: input.appUserId ?? null,
    action,
    route,
  });
  if (
    await shouldSkipEmployeeAccessLogWrite({
      employeeId: input.employeeId ?? null,
      appUserId: input.appUserId ?? null,
      action,
      route,
      throttleKey,
      throttleMs,
    })
  ) {
    return;
  }

  const result = await runBestEffortDbWrite({
    label: "b2b-employee-access-log",
    task: () =>
      db.b2bEmployeeAccessLog.create({
        data: {
          employeeId: input.employeeId ?? null,
          appUserId: input.appUserId ?? null,
          action,
          route,
          ipHash: hashIp(input.ip),
          userAgent: input.userAgent ?? null,
          payload: asJsonValue(input.payload),
        },
      }),
  });
  if (result.ok) {
    rememberLogThrottleKey(throttleKey, throttleMs);
  }
}

export async function logB2bAdminAction(input: {
  employeeId?: string | null;
  action: string;
  actorTag?: string | null;
  payload?: unknown;
}) {
  const action = input.action.trim();
  const actorTag = input.actorTag ?? null;
  const throttleMs = resolveAdminActionLogThrottleMs(action);
  const throttleKey = buildAdminActionThrottleKey({
    employeeId: input.employeeId ?? null,
    action,
    actorTag,
  });
  if (
    await shouldSkipAdminActionLogWrite({
      employeeId: input.employeeId ?? null,
      action,
      actorTag,
      throttleKey,
      throttleMs,
    })
  ) {
    return;
  }

  const result = await runBestEffortDbWrite({
    label: "b2b-admin-action-log",
    task: () =>
      db.b2bAdminActionLog.create({
        data: {
          employeeId: input.employeeId ?? null,
          action,
          actorTag,
          payload: asJsonValue(input.payload),
        },
      }),
  });
  if (result.ok) {
    rememberLogThrottleKey(throttleKey, throttleMs);
  }
}
