import * as webpush from "web-push";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { ORDER_STATUS } from "./order/orderStatus";
import {
  elapsedPushMs,
  pushErrorMeta,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";

webpush.setVapidDetails(
  "mailto:wellnessbox.me@gmail.com",
  (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim(),
  (process.env.VAPID_PRIVATE_KEY || "").trim()
);

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

type PushRole = "customer" | "pharm" | "rider";

type PushTarget = {
  orderId?: number;
  pharmacyId?: number;
  riderId?: number;
};

type SubscriptionRecord = {
  endpoint: string;
  auth: string;
  p256dh: string;
};

type PushFailureType =
  | "dead_endpoint"
  | "auth_error"
  | "timeout"
  | "network"
  | "unknown"
  | "internal";

type PushClassifiedError = {
  failureType: Exclude<PushFailureType, "internal">;
  statusCode: number | null;
  isDeadEndpoint: boolean;
  isRetryable: boolean;
};

type PushSendOutcome =
  | { kind: "sent"; endpoint: string }
  | {
      kind: "failed";
      endpoint: string;
      failureType: PushFailureType;
      statusCode: number | null;
      isDeadEndpoint: boolean;
      errorMeta?: Record<string, unknown>;
    };

const DEFAULT_PUSH_CONCURRENCY = 8;
const MAX_PUSH_CONCURRENCY = 32;
const DEFAULT_PUSH_RETRY_COUNT = 1;
const MAX_PUSH_RETRY_COUNT = 3;
const TRANSIENT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
]);
let pushDeliveryTableAvailable = true;

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function readNonNegativeInt(
  value: string | undefined,
  fallback: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function resolvePushConcurrency() {
  return readPositiveInt(
    process.env.WB_PUSH_SEND_CONCURRENCY,
    DEFAULT_PUSH_CONCURRENCY,
    MAX_PUSH_CONCURRENCY
  );
}

function resolvePushRetryCount() {
  return readNonNegativeInt(
    process.env.WB_PUSH_SEND_RETRIES,
    DEFAULT_PUSH_RETRY_COUNT,
    MAX_PUSH_RETRY_COUNT
  );
}

function isPushDedupeEnabled() {
  return process.env.WB_PUSH_ENABLE_DEDUPE !== "0";
}

function shouldCleanDeadSubscriptions() {
  return process.env.WB_PUSH_CLEAN_DEAD !== "0";
}

function dedupeByEndpoint(subs: SubscriptionRecord[]) {
  const unique = new Map<string, SubscriptionRecord>();
  for (const sub of subs) {
    if (!sub.endpoint || unique.has(sub.endpoint)) continue;
    unique.set(sub.endpoint, sub);
  }
  return Array.from(unique.values());
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isPushDeliveryTableMissingError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2021") return false;
  const tableName = String((error.meta as { table?: unknown })?.table ?? "");
  return tableName.toLowerCase().includes("pushdelivery");
}

function isRetryableStatusCode(statusCode: number | null) {
  if (statusCode === null) return false;
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function classifyPushError(error: unknown): PushClassifiedError {
  const rawStatusCode = Number(
    (error as { statusCode?: unknown; status?: unknown } | undefined)
      ?.statusCode ??
      (error as { status?: unknown } | undefined)?.status
  );
  const statusCode = Number.isFinite(rawStatusCode) ? rawStatusCode : null;
  const errorCode = String(
    (error as { code?: unknown } | undefined)?.code ?? ""
  ).toUpperCase();

  if (statusCode === 404 || statusCode === 410) {
    return {
      failureType: "dead_endpoint",
      statusCode,
      isDeadEndpoint: true,
      isRetryable: false,
    };
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      failureType: "auth_error",
      statusCode,
      isDeadEndpoint: false,
      isRetryable: false,
    };
  }
  if (TRANSIENT_ERROR_CODES.has(errorCode) || statusCode === 408) {
    return {
      failureType: "timeout",
      statusCode,
      isDeadEndpoint: false,
      isRetryable: true,
    };
  }
  if (errorCode.startsWith("ECONN") || isRetryableStatusCode(statusCode)) {
    return {
      failureType: "network",
      statusCode,
      isDeadEndpoint: false,
      isRetryable: true,
    };
  }
  return {
    failureType: "unknown",
    statusCode,
    isDeadEndpoint: false,
    isRetryable: false,
  };
}

function resolveTargetScope(role: PushRole, target: PushTarget) {
  if (role === "customer") return { orderId: target.orderId };
  if (role === "pharm") return { pharmacyId: target.pharmacyId };
  return { riderId: target.riderId };
}

function buildPushDeliveryGateWhere(
  eventKey: string,
  role: PushRole,
  target: PushTarget
): Prisma.PushDeliveryWhereInput {
  return {
    eventKey,
    role,
    endpoint: "__target__",
    ...resolveTargetScope(role, target),
  };
}

function addFailureCount(
  failureByType: Record<string, number>,
  failureType: PushFailureType
) {
  failureByType[failureType] = (failureByType[failureType] ?? 0) + 1;
}

async function wait(ms: number) {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];
  const size = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let index = 0;

  async function runWorker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) break;
      try {
        const value = await worker(items[current], current);
        results[current] = { status: "fulfilled", value };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: size }, () => runWorker()));
  return results;
}

async function fetchActiveSubscriptions(
  where: Prisma.SubscriptionWhereInput,
  label: string
) {
  const startedAt = startPushTimer();
  const raw = await db.subscription.findMany({
    where: { ...where, invalidatedAt: null },
    select: { endpoint: true, auth: true, p256dh: true },
  });
  const deduped = dedupeByEndpoint(raw);
  pushLog("subscription.fetch", {
    label,
    rawCount: raw.length,
    dedupedCount: deduped.length,
    elapsedMs: elapsedPushMs(startedAt),
  });
  return deduped;
}

type OrderPushSummary = {
  pharmacyId: number | null;
  riderId: number | null;
  phone: string | null;
  roadAddress: string | null;
  detailAddress: string | null;
  firstProductName: string | null;
  firstProductImage: string | null;
  itemCount: number;
};

async function getOrderPushSummary(orderId: number): Promise<OrderPushSummary | null> {
  const rows = await db.$queryRaw<
    Array<{
      pharmacyId: number | null;
      riderId: number | null;
      phone: string | null;
      roadAddress: string | null;
      detailAddress: string | null;
      firstProductName: string | null;
      firstProductImages: string[] | null;
      itemCount: number | bigint;
    }>
  >(Prisma.sql`
    SELECT
      o."pharmacyId" AS "pharmacyId",
      o."riderId" AS "riderId",
      o."phone" AS "phone",
      o."roadAddress" AS "roadAddress",
      o."detailAddress" AS "detailAddress",
      p."name" AS "firstProductName",
      p."images" AS "firstProductImages",
      COALESCE(item_counts."itemCount", 0) AS "itemCount"
    FROM "Order" o
    LEFT JOIN LATERAL (
      SELECT oi."pharmacyProductId" AS "pharmacyProductId"
      FROM "OrderItem" oi
      WHERE oi."orderId" = o."id"
      ORDER BY oi."id" ASC
      LIMIT 1
    ) first_item ON TRUE
    LEFT JOIN "PharmacyProduct" pp ON pp."id" = first_item."pharmacyProductId"
    LEFT JOIN "Product" p ON p."id" = pp."productId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS "itemCount"
      FROM "OrderItem" oi
      WHERE oi."orderId" = o."id"
    ) item_counts ON TRUE
    WHERE o."id" = ${orderId}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;

  const imageList = Array.isArray(row.firstProductImages)
    ? row.firstProductImages
    : [];
  const itemCount =
    typeof row.itemCount === "bigint"
      ? Number(row.itemCount)
      : Number(row.itemCount ?? 0);

  return {
    pharmacyId: row.pharmacyId,
    riderId: row.riderId,
    phone: row.phone,
    roadAddress: row.roadAddress,
    detailAddress: row.detailAddress,
    firstProductName: row.firstProductName,
    firstProductImage: imageList[0] ?? null,
    itemCount: Number.isFinite(itemCount) ? itemCount : 0,
  };
}

async function reservePushDelivery(
  eventKey: string,
  role: PushRole,
  target: PushTarget
) {
  if (!pushDeliveryTableAvailable) {
    return { trackingEnabled: false, deduped: false };
  }
  try {
    const result = await db.pushDelivery.createMany({
      data: [
        {
          eventKey,
          role,
          endpoint: "__target__",
          status: "pending",
          ...resolveTargetScope(role, target),
        },
      ],
      skipDuplicates: true,
    });
    return {
      trackingEnabled: true,
      deduped: result.count === 0,
    };
  } catch (error) {
    if (isPushDeliveryTableMissingError(error)) {
      pushDeliveryTableAvailable = false;
      pushLog("send.dedupe.disabled", {
        reason: "push_delivery_table_missing",
      });
      return { trackingEnabled: false, deduped: false };
    }
    if (isPrismaUniqueConstraintError(error)) {
      return { trackingEnabled: true, deduped: true };
    }
    throw error;
  }
}

async function finalizePushDeliveryGate(
  eventKey: string,
  role: PushRole,
  target: PushTarget,
  trackingEnabled: boolean,
  status: "sent" | "failed" | "partial_failed",
  failureByType: Record<string, number>
) {
  if (!trackingEnabled) return;
  try {
    await db.pushDelivery.updateMany({
      where: buildPushDeliveryGateWhere(eventKey, role, target),
      data: {
        status,
        deliveredAt: new Date(),
        errorType: status === "sent" ? null : Object.keys(failureByType).join(","),
        errorStatusCode: null,
      },
    });
  } catch (error) {
    if (isPushDeliveryTableMissingError(error)) {
      pushDeliveryTableAvailable = false;
      return;
    }
    throw error;
  }
}

async function invalidateDeadSubscriptions(
  role: PushRole,
  target: PushTarget,
  deadByStatus: Map<number, Set<string>>
) {
  if (deadByStatus.size === 0) return;
  const scopeWhere = resolveTargetScope(role, target);
  const now = new Date();
  const updates: Prisma.PrismaPromise<unknown>[] = [];

  for (const [statusCode, endpointSet] of deadByStatus.entries()) {
    const endpoints = Array.from(endpointSet);
    if (endpoints.length === 0) continue;
    updates.push(
      db.subscription.updateMany({
        where: {
          role,
          ...scopeWhere,
          endpoint: { in: endpoints },
        },
        data: {
          invalidatedAt: now,
          lastFailureStatus: statusCode,
        },
      })
    );
  }

  if (updates.length > 0) {
    await db.$transaction(updates);
  }
}

type SendPushFanoutOptions = {
  label: string;
  role: PushRole;
  eventKey: string;
  target: PushTarget;
  subscriptions: SubscriptionRecord[];
  payload: string;
};

async function sendPushFanout({
  label,
  role,
  eventKey,
  target,
  subscriptions,
  payload,
}: SendPushFanoutOptions) {
  if (subscriptions.length === 0) {
    pushLog("send.skip", { label, role, eventKey, reason: "no_subscriptions" });
    return;
  }

  const startedAt = startPushTimer();
  const concurrency = resolvePushConcurrency();
  const retryCount = resolvePushRetryCount();
  const dedupeEnabled = isPushDedupeEnabled();
  const deadCleanupEnabled = shouldCleanDeadSubscriptions();

  const deliveryGate = dedupeEnabled
    ? await reservePushDelivery(eventKey, role, target)
    : { trackingEnabled: false, deduped: false };
  if (dedupeEnabled && deliveryGate.deduped) {
    pushLog("send.deduped", {
      label,
      role,
      eventKey,
      elapsedMs: elapsedPushMs(startedAt),
    });
    return;
  }

  const deadByStatus = new Map<number, Set<string>>();
  const failureByType: Record<string, number> = {};
  let sendAttempts = 0;
  let sentCount = 0;
  let failedCount = 0;

  pushLog("send.start", {
    label,
    role,
    eventKey,
    subscriptionCount: subscriptions.length,
    concurrency,
    retryCount,
    dedupeEnabled,
    deadCleanupEnabled,
  });

  const settled = await mapWithConcurrency(
    subscriptions,
    concurrency,
    async (sub): Promise<PushSendOutcome> => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { auth: sub.auth, p256dh: sub.p256dh },
      } as webpush.PushSubscription;

      const maxAttempts = 1 + retryCount;
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt += 1;
        sendAttempts += 1;
        try {
          await webpush.sendNotification(pushSub, payload);
          return { kind: "sent", endpoint: sub.endpoint };
        } catch (error) {
          const classified = classifyPushError(error);
          const shouldRetry = classified.isRetryable && attempt < maxAttempts;
          if (shouldRetry) {
            await wait(60 * attempt);
            continue;
          }
          return {
            kind: "failed",
            endpoint: sub.endpoint,
            failureType: classified.failureType,
            statusCode: classified.statusCode,
            isDeadEndpoint: classified.isDeadEndpoint,
            errorMeta: pushErrorMeta(error),
          };
        }
      }

      return {
        kind: "failed",
        endpoint: sub.endpoint,
        failureType: "internal",
        statusCode: null,
        isDeadEndpoint: false,
      };
    }
  );

  for (const result of settled) {
    if (result.status === "rejected") {
      failedCount += 1;
      addFailureCount(failureByType, "internal");
      pushLog("send.worker_error", {
        label,
        role,
        eventKey,
        ...pushErrorMeta(result.reason),
      });
      continue;
    }

    const outcome = result.value;
    if (outcome.kind === "sent") {
      sentCount += 1;
      continue;
    }

    failedCount += 1;
    addFailureCount(failureByType, outcome.failureType);
    if (outcome.isDeadEndpoint && outcome.statusCode !== null) {
      const statusSet =
        deadByStatus.get(outcome.statusCode) ?? new Set<string>();
      statusSet.add(outcome.endpoint);
      deadByStatus.set(outcome.statusCode, statusSet);
    }
  }

  const postWriteTasks: Promise<unknown>[] = [];
  if (deadCleanupEnabled) {
    postWriteTasks.push(invalidateDeadSubscriptions(role, target, deadByStatus));
  }
  postWriteTasks.push(
    finalizePushDeliveryGate(
      eventKey,
      role,
      target,
      deliveryGate.trackingEnabled,
      failedCount === 0 ? "sent" : sentCount > 0 ? "partial_failed" : "failed",
      failureByType
    )
  );
  await Promise.all(postWriteTasks);

  pushLog("send.complete", {
    label,
    role,
    eventKey,
    subscriptionCount: subscriptions.length,
    sendAttempts,
    sentCount,
    failedCount,
    dedupedCount: dedupeEnabled && deliveryGate.deduped ? subscriptions.length : 0,
    deadEndpointCount: Array.from(deadByStatus.values()).reduce(
      (acc, endpointSet) => acc + endpointSet.size,
      0
    ),
    failureByType,
    elapsedMs: elapsedPushMs(startedAt),
  });
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

export async function sendOrderNotification(
  orderId: number,
  status: string,
  image?: string
) {
  const startedAt = startPushTimer();
  const [subs, orderSummary] = await Promise.all([
    fetchActiveSubscriptions({ role: "customer", orderId }, "customer.order_status"),
    getOrderPushSummary(orderId),
  ]);
  if (subs.length === 0) return;

  const firstName = orderSummary?.firstProductName || "?곹뭹";
  const restCount = (orderSummary?.itemCount || 1) - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;
  const imageUrl = image || orderSummary?.firstProductImage || undefined;

  let message = "";
  switch (status) {
    case ORDER_STATUS.PAYMENT_COMPLETE:
      message = `'${productText}' ?곹뭹??二쇰Ц???꾨즺?섏뿀?댁슂. '??二쇰Ц 議고쉶?섍린'?먯꽌 ?곷떞??吏꾪뻾?섏떎 ???덉뼱??`;
      break;
    case ORDER_STATUS.COUNSEL_COMPLETE:
      message = `二쇰Ц?섏떊 '${productText}'??議곗젣媛 ?쒖옉?섏뿀?댁슂. ?덉쟾?섍쾶 議곗젣???쒕┫寃뚯슂.`;
      break;
    case ORDER_STATUS.DISPENSE_COMPLETE:
      message = `二쇰Ц?섏떊 '${productText}'??議곗젣媛 ?꾨즺?섏뿀?댁슂. 諛곗넚???쒖옉?섎㈃ ?뚮젮?쒕┫寃뚯슂.`;
      break;
    case ORDER_STATUS.PICKUP_COMPLETE:
      message = `二쇰Ц?섏떊 '${productText}' ?곹뭹??異쒕컻?덉뼱?? ?덉쟾?섍쾶 諛곗넚???쒕┫寃뚯슂.`;
      break;
    case ORDER_STATUS.DELIVERY_COMPLETE:
      message = `二쇰Ц?섏떊 '${productText}' ?곹뭹???꾩갑?덉뼱?? 嫄닿컯?섍쾶 梨숆꺼 ?쒖꽭??`;
      break;
    case ORDER_STATUS.CANCELED:
      message = `二쇰Ц?섏떊 '${productText}' ?곹뭹??痍⑥냼?섏뿀?댁슂.`;
      break;
    default:
      message = `二쇰Ц?섏떊 '${productText}'???곹깭媛 ?낅뜲?댄듃?섏뿀?댁슂: ${status}`;
  }

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/my-orders",
    image: imageUrl,
  });

  await sendPushFanout({
    label: "customer.order_status",
    role: "customer",
    eventKey: `order:${orderId}:customer:status:${status}`,
    target: { orderId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "customer.order_status",
    orderId,
    status,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendNewOrderNotification(orderId: number) {
  const startedAt = startPushTimer();
  const orderSummary = await getOrderPushSummary(orderId);

  const pharmacyId = orderSummary?.pharmacyId;
  if (!orderSummary || !pharmacyId) return;
  const subs = await fetchActiveSubscriptions(
    { pharmacyId, role: "pharm" },
    "pharm.new_order"
  );
  if (subs.length === 0) return;

  const firstName =
    orderSummary.firstProductName || "?곹뭹";
  const restCount = orderSummary.itemCount - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;

  const phone = orderSummary.phone
    ? `\n?꾪솕踰덊샇: ${orderSummary.phone}`
    : "";
  const address = orderSummary.roadAddress
    ? `\n二쇱냼: ${orderSummary.roadAddress} ${orderSummary.detailAddress || ""}`
    : "";

  const imageUrl = orderSummary.firstProductImage || undefined;
  const message = `'${productText}' 二쇰Ц???ㅼ뼱?붿뼱??${phone}${address}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/pharm",
    icon: "/logo.png",
    image: imageUrl,
    actions: [{ action: "open", title: "주문 확인" }],
  });

  await sendPushFanout({
    label: "pharm.new_order",
    role: "pharm",
    eventKey: `order:${orderId}:pharm:new_order`,
    target: { pharmacyId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "pharm.new_order",
    orderId,
    pharmacyId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendRiderNotification(orderId: number) {
  const startedAt = startPushTimer();
  const orderSummary = await getOrderPushSummary(orderId);

  const riderId = orderSummary?.riderId;
  if (!orderSummary || !riderId) return;

  const subs = await fetchActiveSubscriptions(
    { role: "rider", riderId },
    "rider.dispatch"
  );
  if (subs.length === 0) return;

  const firstName =
    orderSummary.firstProductName || "?곹뭹";
  const restCount = orderSummary.itemCount - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;

  const phone = orderSummary.phone
    ? `\n?꾪솕踰덊샇: ${orderSummary.phone}`
    : "";
  const address = orderSummary.roadAddress
    ? `\n二쇱냼: ${orderSummary.roadAddress} ${orderSummary.detailAddress || ""}`
    : "";

  const imageUrl = orderSummary.firstProductImage || undefined;
  const message = `'${productText}' 二쇰Ц???쎌뾽 ?湲?以묒씠?먯슂.${phone}${address}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/rider",
    icon: "/logo.png",
    image: imageUrl,
    actions: [{ action: "open", title: "주문 확인" }],
  });

  await sendPushFanout({
    label: "rider.dispatch",
    role: "rider",
    eventKey: `order:${orderId}:rider:dispatch`,
    target: { riderId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "rider.dispatch",
    orderId,
    riderId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendPharmacyMessageNotification(
  orderId: number,
  content: string,
  eventKey?: string
) {
  const startedAt = startPushTimer();
  const orderSummary = await getOrderPushSummary(orderId);

  const pharmacyId = orderSummary?.pharmacyId;
  if (!orderSummary || !pharmacyId) return;

  const subs = await fetchActiveSubscriptions(
    { pharmacyId, role: "pharm" },
    "pharm.message"
  );
  if (subs.length === 0) return;

  const firstName =
    orderSummary.firstProductName || "?곹뭹";
  const restCount = orderSummary.itemCount - 1;
  const productText = restCount > 0 ? `${firstName} 외 ${restCount}건` : firstName;

  const phoneText = orderSummary.phone ? `${orderSummary.phone} ` : "";
  const message = `${phoneText}二쇰Ц?먭? '${productText}' 二쇰Ц?????硫붿떆吏瑜?蹂대깉?댁슂: ${content}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/pharm",
    icon: "/logo.png",
  });

  await sendPushFanout({
    label: "pharm.message",
    role: "pharm",
    eventKey:
      eventKey ??
      `order:${orderId}:pharm:message:${content.slice(0, 32)}`,
    target: { pharmacyId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "pharm.message",
    orderId,
    pharmacyId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}

export async function sendCustomerMessageNotification(
  orderId: number,
  content: string,
  eventKey?: string
) {
  const startedAt = startPushTimer();
  const [order, subs] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      select: {
        pharmacy: {
          select: {
            name: true,
          },
        },
      },
    }),
    fetchActiveSubscriptions({ role: "customer", orderId }, "customer.message"),
  ]);

  if (!order) return;
  if (subs.length === 0) return;

  const pharmacyName = order.pharmacy?.name || "?쎄뎅";
  const message = `${pharmacyName}?먯꽌 ?쎌궗?섏씠 硫붿떆吏瑜?蹂대깉?댁슂: ${content}`;

  const payload = JSON.stringify({
    title: "웰니스박스",
    body: message,
    url: "/my-orders",
    icon: "/logo.png",
  });

  await sendPushFanout({
    label: "customer.message",
    role: "customer",
    eventKey:
      eventKey ??
      `order:${orderId}:customer:message:${content.slice(0, 32)}`,
    target: { orderId },
    subscriptions: subs,
    payload,
  });

  pushLog("send.entry.complete", {
    label: "customer.message",
    orderId,
    elapsedMs: elapsedPushMs(startedAt),
  });
}



