import db from "@/lib/db";
import {
  elapsedPushMs,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";
import type { Prisma } from "@prisma/client";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

type PushStatusAction = "sync" | "resubscribe" | "noop";

type PushStatusResult = {
  subscribed: boolean;
  action: PushStatusAction;
};

type SubscriptionScopeField = "orderId" | "pharmacyId" | "riderId";

const ACTIVE_RESET_DATA = {
  invalidatedAt: null,
  lastFailureStatus: null,
} as const;

export const PHARM_ROLE = "pharm";
export const RIDER_ROLE = "rider";

function extractSubscriptionCrypto(sub: PushSubscriptionPayload) {
  return {
    auth: sub.keys?.auth ?? "",
    p256dh: sub.keys?.p256dh ?? "",
  };
}

function resolveStatusAction(
  sub: { invalidatedAt: Date | null } | null
): PushStatusResult {
  if (!sub) return { subscribed: false, action: "sync" };
  if (sub.invalidatedAt) {
    return { subscribed: false, action: "resubscribe" };
  }
  return { subscribed: true, action: "noop" };
}

export async function upsertSubscriptionWithLog(options: {
  subscription: PushSubscriptionPayload;
  upsert: Parameters<typeof db.subscription.upsert>[0];
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  const startedAt = startPushTimer();
  const saved = await db.subscription.upsert(options.upsert);
  pushLog(options.logEvent, {
    ...options.logMeta,
    endpoint: options.subscription.endpoint,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return saved;
}

export async function deleteSubscriptionsWithLog(options: {
  where: Prisma.SubscriptionWhereInput;
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({ where: options.where });
  pushLog(options.logEvent, {
    ...options.logMeta,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

async function hasActiveSubscription(
  where: Prisma.SubscriptionWhereInput
): Promise<boolean> {
  const sub = await db.subscription.findFirst({
    where,
    select: { id: true, invalidatedAt: true },
  });
  return !!sub && !sub.invalidatedAt;
}

async function getStatusWithLog(options: {
  where: Prisma.SubscriptionWhereInput;
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  const startedAt = startPushTimer();
  const sub = await db.subscription.findFirst({
    where: options.where,
    select: { invalidatedAt: true },
  });
  const result = resolveStatusAction(sub);
  pushLog(options.logEvent, {
    ...options.logMeta,
    subscribed: result.subscribed,
    action: result.action,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return result;
}

function buildScopeWhere(params: {
  role: string;
  endpoint: string;
  scopeField: SubscriptionScopeField;
  scopeId: number;
}): Prisma.SubscriptionWhereInput {
  const { role, endpoint, scopeField, scopeId } = params;
  return {
    role,
    endpoint,
    [scopeField]: scopeId,
  } as Prisma.SubscriptionWhereInput;
}

function buildScopeWhereExcept(params: {
  role: string;
  endpoint: string;
  scopeField: SubscriptionScopeField;
  scopeId: number;
}): Prisma.SubscriptionWhereInput {
  const { role, endpoint, scopeField, scopeId } = params;
  return {
    endpoint,
    role,
    NOT: {
      [scopeField]: scopeId,
    },
  } as Prisma.SubscriptionWhereInput;
}

function buildScopeCreateData(params: {
  role: string;
  endpoint: string;
  scopeField: SubscriptionScopeField;
  scopeId: number;
  crypto: ReturnType<typeof extractSubscriptionCrypto>;
}): Prisma.SubscriptionCreateInput {
  const { role, endpoint, scopeField, scopeId, crypto } = params;
  return {
    role,
    endpoint,
    ...crypto,
    ...ACTIVE_RESET_DATA,
    [scopeField]: scopeId,
  } as Prisma.SubscriptionCreateInput;
}

export async function saveScopedSubscription(options: {
  role: string;
  subscription: PushSubscriptionPayload;
  scopeField: SubscriptionScopeField;
  scopeId: number;
  upsertWhere: Prisma.SubscriptionWhereUniqueInput;
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  const crypto = extractSubscriptionCrypto(options.subscription);
  return upsertSubscriptionWithLog({
    subscription: options.subscription,
    logEvent: options.logEvent,
    logMeta: options.logMeta,
    upsert: {
      where: options.upsertWhere,
      update: { ...crypto, ...ACTIVE_RESET_DATA },
      create: buildScopeCreateData({
        role: options.role,
        endpoint: options.subscription.endpoint,
        scopeField: options.scopeField,
        scopeId: options.scopeId,
        crypto,
      }),
    },
  });
}

export async function removeScopedSubscription(options: {
  role: string;
  endpoint: string;
  scopeField: SubscriptionScopeField;
  scopeId: number;
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  return deleteSubscriptionsWithLog({
    where: buildScopeWhere({
      role: options.role,
      endpoint: options.endpoint,
      scopeField: options.scopeField,
      scopeId: options.scopeId,
    }),
    logEvent: options.logEvent,
    logMeta: options.logMeta,
  });
}

export async function removeScopedSubscriptionsByEndpointExcept(options: {
  role: string;
  endpoint: string;
  scopeField: SubscriptionScopeField;
  scopeId: number;
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  return deleteSubscriptionsWithLog({
    where: buildScopeWhereExcept({
      role: options.role,
      endpoint: options.endpoint,
      scopeField: options.scopeField,
      scopeId: options.scopeId,
    }),
    logEvent: options.logEvent,
    logMeta: options.logMeta,
  });
}

export function isScopedSubscribed(
  role: string,
  scopeField: SubscriptionScopeField,
  scopeId: number,
  endpoint: string
) {
  return hasActiveSubscription(
    buildScopeWhere({ role, endpoint, scopeField, scopeId })
  );
}

export function getScopedSubscriptionStatus(options: {
  role: string;
  endpoint: string;
  scopeField: SubscriptionScopeField;
  scopeId: number;
  logEvent: string;
  logMeta: Record<string, unknown>;
}) {
  return getStatusWithLog({
    where: buildScopeWhere({
      role: options.role,
      endpoint: options.endpoint,
      scopeField: options.scopeField,
      scopeId: options.scopeId,
    }),
    logEvent: options.logEvent,
    logMeta: options.logMeta,
  });
}
