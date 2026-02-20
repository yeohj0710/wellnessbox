import db from "@/lib/db";
import {
  elapsedPushMs,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";
import type { Prisma } from "@prisma/client";

type PushSubscriptionPayload = {
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

const ACTIVE_RESET_DATA = {
  invalidatedAt: null,
  lastFailureStatus: null,
} as const;

function extractSubscriptionCrypto(sub: PushSubscriptionPayload) {
  return {
    auth: sub.keys?.auth ?? "",
    p256dh: sub.keys?.p256dh ?? "",
  };
}

function resolveStatusAction(sub: { invalidatedAt: Date | null } | null): PushStatusResult {
  if (!sub) return { subscribed: false, action: "sync" };
  if (sub.invalidatedAt) {
    return { subscribed: false, action: "resubscribe" };
  }
  return { subscribed: true, action: "noop" };
}

async function upsertSubscriptionWithLog(options: {
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

async function deleteSubscriptionsWithLog(options: {
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

export async function saveSubscription(
  orderId: number,
  sub: PushSubscriptionPayload,
  role: string
) {
  const crypto = extractSubscriptionCrypto(sub);
  return upsertSubscriptionWithLog({
    subscription: sub,
    logEvent: "subscription.save",
    logMeta: { role, orderId },
    upsert: {
      where: {
        role_orderId_endpoint: { role, orderId, endpoint: sub.endpoint },
      },
      update: { ...crypto, ...ACTIVE_RESET_DATA },
      create: {
        role,
        orderId,
        endpoint: sub.endpoint,
        ...crypto,
        ...ACTIVE_RESET_DATA,
      },
    },
  });
}

export async function removeSubscription(
  endpoint: string,
  orderId: number,
  role: string
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, orderId, role },
    logEvent: "subscription.remove",
    logMeta: { role, orderId, endpoint },
  });
}

export async function removeSubscriptionsByEndpoint(
  endpoint: string,
  role: string
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, role },
    logEvent: "subscription.remove_by_endpoint",
    logMeta: { role, endpoint },
  });
}

export async function removeSubscriptionsByEndpointAll(endpoint: string) {
  return deleteSubscriptionsWithLog({
    where: { endpoint },
    logEvent: "subscription.remove_all_roles",
    logMeta: { endpoint },
  });
}

export async function removeSubscriptionsByEndpointExceptRole(
  endpoint: string,
  role: string
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, role: { not: role } },
    logEvent: "subscription.remove_except_role",
    logMeta: { role, endpoint },
  });
}

export async function isSubscribed(
  orderId: number,
  endpoint: string,
  role: string
) {
  return hasActiveSubscription({ orderId, endpoint, role });
}

export async function savePharmacySubscription(
  pharmacyId: number,
  sub: PushSubscriptionPayload
) {
  const crypto = extractSubscriptionCrypto(sub);
  return upsertSubscriptionWithLog({
    subscription: sub,
    logEvent: "subscription.save_pharm",
    logMeta: { role: "pharm", pharmacyId },
    upsert: {
      where: {
        role_pharmacyId_endpoint: {
          role: "pharm",
          pharmacyId,
          endpoint: sub.endpoint,
        },
      },
      update: { ...crypto, ...ACTIVE_RESET_DATA },
      create: {
        role: "pharm",
        pharmacyId,
        endpoint: sub.endpoint,
        ...crypto,
        ...ACTIVE_RESET_DATA,
      },
    },
  });
}

export async function removePharmacySubscription(
  endpoint: string,
  pharmacyId: number
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, pharmacyId, role: "pharm" },
    logEvent: "subscription.remove_pharm",
    logMeta: { role: "pharm", pharmacyId, endpoint },
  });
}

export async function removePharmacySubscriptionsByEndpointExcept(
  endpoint: string,
  pharmacyId: number
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, role: "pharm", NOT: { pharmacyId } },
    logEvent: "subscription.remove_pharm_except",
    logMeta: { role: "pharm", pharmacyId, endpoint },
  });
}

export async function isPharmacySubscribed(
  pharmacyId: number,
  endpoint: string
) {
  return hasActiveSubscription({ pharmacyId, endpoint, role: "pharm" });
}

export async function saveRiderSubscription(
  riderId: number,
  sub: PushSubscriptionPayload
) {
  const crypto = extractSubscriptionCrypto(sub);
  return upsertSubscriptionWithLog({
    subscription: sub,
    logEvent: "subscription.save_rider",
    logMeta: { role: "rider", riderId },
    upsert: {
      where: {
        role_riderId_endpoint: {
          role: "rider",
          riderId,
          endpoint: sub.endpoint,
        },
      },
      update: { ...crypto, ...ACTIVE_RESET_DATA },
      create: {
        role: "rider",
        riderId,
        endpoint: sub.endpoint,
        ...crypto,
        ...ACTIVE_RESET_DATA,
      },
    },
  });
}

export async function removeRiderSubscription(
  endpoint: string,
  riderId: number
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, riderId, role: "rider" },
    logEvent: "subscription.remove_rider",
    logMeta: { role: "rider", riderId, endpoint },
  });
}

export async function removeRiderSubscriptionsByEndpointExcept(
  endpoint: string,
  riderId: number
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, role: "rider", NOT: { riderId } },
    logEvent: "subscription.remove_rider_except",
    logMeta: { role: "rider", riderId, endpoint },
  });
}

export async function isRiderSubscribed(riderId: number, endpoint: string) {
  return hasActiveSubscription({ riderId, endpoint, role: "rider" });
}

export async function getSubscriptionStatus(
  orderId: number,
  endpoint: string,
  role: string
) {
  return getStatusWithLog({
    where: { orderId, endpoint, role },
    logEvent: "subscription.status",
    logMeta: { role, orderId, endpoint },
  });
}

export async function getPharmacySubscriptionStatus(
  pharmacyId: number,
  endpoint: string
) {
  return getStatusWithLog({
    where: { pharmacyId, endpoint, role: "pharm" },
    logEvent: "subscription.status_pharm",
    logMeta: { role: "pharm", pharmacyId, endpoint },
  });
}

export async function getRiderSubscriptionStatus(
  riderId: number,
  endpoint: string
) {
  return getStatusWithLog({
    where: { riderId, endpoint, role: "rider" },
    logEvent: "subscription.status_rider",
    logMeta: { role: "rider", riderId, endpoint },
  });
}
