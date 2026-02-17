import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  elapsedPushMs,
  pushErrorMeta,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";
import { webpush } from "./webpush-client";

export type PushRole = "customer" | "pharm" | "rider";

export type PushTarget = {
  orderId?: number;
  pharmacyId?: number;
  riderId?: number;
};

export type SubscriptionRecord = {
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

export async function fetchActiveSubscriptions(
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

export type OrderPushSummary = {
  pharmacyId: number | null;
  riderId: number | null;
  phone: string | null;
  roadAddress: string | null;
  detailAddress: string | null;
  firstProductName: string | null;
  firstProductImage: string | null;
  itemCount: number;
};

export async function getOrderPushSummary(
  orderId: number
): Promise<OrderPushSummary | null> {
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

export async function sendPushFanout({
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
