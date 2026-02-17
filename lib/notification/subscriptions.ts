import db from "@/lib/db";
import {
  elapsedPushMs,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";

export async function saveSubscription(
  orderId: number,
  sub: any,
  role: string
) {
  const startedAt = startPushTimer();
  const auth = sub.keys?.auth || "";
  const p256dh = sub.keys?.p256dh || "";
  const saved = await db.subscription.upsert({
    where: {
      role_orderId_endpoint: { role, orderId, endpoint: sub.endpoint },
    },
    update: { auth, p256dh, invalidatedAt: null, lastFailureStatus: null },
    create: {
      role,
      orderId,
      endpoint: sub.endpoint,
      auth,
      p256dh,
      invalidatedAt: null,
      lastFailureStatus: null,
    },
  });
  pushLog("subscription.save", {
    role,
    orderId,
    endpoint: sub.endpoint,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return saved;
}

export async function removeSubscription(
  endpoint: string,
  orderId: number,
  role: string
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, orderId, role },
  });
  pushLog("subscription.remove", {
    role,
    orderId,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function removeSubscriptionsByEndpoint(
  endpoint: string,
  role: string
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, role },
  });
  pushLog("subscription.remove_by_endpoint", {
    role,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function removeSubscriptionsByEndpointAll(endpoint: string) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint },
  });
  pushLog("subscription.remove_all_roles", {
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function removeSubscriptionsByEndpointExceptRole(
  endpoint: string,
  role: string
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, role: { not: role } },
  });
  pushLog("subscription.remove_except_role", {
    role,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function isSubscribed(
  orderId: number,
  endpoint: string,
  role: string
) {
  const sub = await db.subscription.findFirst({
    where: { orderId, endpoint, role },
    select: { id: true, invalidatedAt: true },
  });
  return !!sub && !sub.invalidatedAt;
}

export async function savePharmacySubscription(pharmacyId: number, sub: any) {
  const startedAt = startPushTimer();
  const auth = sub.keys?.auth || "";
  const p256dh = sub.keys?.p256dh || "";
  const saved = await db.subscription.upsert({
    where: {
      role_pharmacyId_endpoint: {
        role: "pharm",
        pharmacyId,
        endpoint: sub.endpoint,
      },
    },
    update: { auth, p256dh, invalidatedAt: null, lastFailureStatus: null },
    create: {
      role: "pharm",
      pharmacyId,
      endpoint: sub.endpoint,
      auth,
      p256dh,
      invalidatedAt: null,
      lastFailureStatus: null,
    },
  });
  pushLog("subscription.save_pharm", {
    role: "pharm",
    pharmacyId,
    endpoint: sub.endpoint,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return saved;
}

export async function removePharmacySubscription(
  endpoint: string,
  pharmacyId: number
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, pharmacyId, role: "pharm" },
  });
  pushLog("subscription.remove_pharm", {
    role: "pharm",
    pharmacyId,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function removePharmacySubscriptionsByEndpointExcept(
  endpoint: string,
  pharmacyId: number
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, role: "pharm", NOT: { pharmacyId } },
  });
  pushLog("subscription.remove_pharm_except", {
    role: "pharm",
    pharmacyId,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function isPharmacySubscribed(
  pharmacyId: number,
  endpoint: string
) {
  const sub = await db.subscription.findFirst({
    where: { pharmacyId, endpoint, role: "pharm" },
    select: { id: true, invalidatedAt: true },
  });
  return !!sub && !sub.invalidatedAt;
}

export async function saveRiderSubscription(riderId: number, sub: any) {
  const startedAt = startPushTimer();
  const auth = sub.keys?.auth || "";
  const p256dh = sub.keys?.p256dh || "";
  const saved = await db.subscription.upsert({
    where: {
      role_riderId_endpoint: {
        role: "rider",
        riderId,
        endpoint: sub.endpoint,
      },
    },
    update: { auth, p256dh, invalidatedAt: null, lastFailureStatus: null },
    create: {
      role: "rider",
      riderId,
      endpoint: sub.endpoint,
      auth,
      p256dh,
      invalidatedAt: null,
      lastFailureStatus: null,
    },
  });
  pushLog("subscription.save_rider", {
    role: "rider",
    riderId,
    endpoint: sub.endpoint,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return saved;
}

export async function removeRiderSubscription(
  endpoint: string,
  riderId: number
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, riderId, role: "rider" },
  });
  pushLog("subscription.remove_rider", {
    role: "rider",
    riderId,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function removeRiderSubscriptionsByEndpointExcept(
  endpoint: string,
  riderId: number
) {
  const startedAt = startPushTimer();
  const removed = await db.subscription.deleteMany({
    where: { endpoint, role: "rider", NOT: { riderId } },
  });
  pushLog("subscription.remove_rider_except", {
    role: "rider",
    riderId,
    endpoint,
    removedCount: removed.count,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return removed;
}

export async function isRiderSubscribed(riderId: number, endpoint: string) {
  const sub = await db.subscription.findFirst({
    where: { riderId, endpoint, role: "rider" },
    select: { id: true, invalidatedAt: true },
  });
  return !!sub && !sub.invalidatedAt;
}

type PushStatusAction = "sync" | "resubscribe" | "noop";

function resolveStatusAction(sub: { invalidatedAt: Date | null } | null) {
  if (!sub) return { subscribed: false, action: "sync" as PushStatusAction };
  if (sub.invalidatedAt) {
    return { subscribed: false, action: "resubscribe" as PushStatusAction };
  }
  return { subscribed: true, action: "noop" as PushStatusAction };
}

export async function getSubscriptionStatus(
  orderId: number,
  endpoint: string,
  role: string
) {
  const startedAt = startPushTimer();
  const sub = await db.subscription.findFirst({
    where: { orderId, endpoint, role },
    select: { invalidatedAt: true },
  });
  const result = resolveStatusAction(sub);
  pushLog("subscription.status", {
    role,
    orderId,
    endpoint,
    subscribed: result.subscribed,
    action: result.action,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return result;
}

export async function getPharmacySubscriptionStatus(
  pharmacyId: number,
  endpoint: string
) {
  const startedAt = startPushTimer();
  const sub = await db.subscription.findFirst({
    where: { pharmacyId, endpoint, role: "pharm" },
    select: { invalidatedAt: true },
  });
  const result = resolveStatusAction(sub);
  pushLog("subscription.status_pharm", {
    role: "pharm",
    pharmacyId,
    endpoint,
    subscribed: result.subscribed,
    action: result.action,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return result;
}

export async function getRiderSubscriptionStatus(
  riderId: number,
  endpoint: string
) {
  const startedAt = startPushTimer();
  const sub = await db.subscription.findFirst({
    where: { riderId, endpoint, role: "rider" },
    select: { invalidatedAt: true },
  });
  const result = resolveStatusAction(sub);
  pushLog("subscription.status_rider", {
    role: "rider",
    riderId,
    endpoint,
    subscribed: result.subscribed,
    action: result.action,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return result;
}
