import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  elapsedPushMs,
  pushErrorMeta,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";
import { webpush } from "./webpush-client";
import { classifyPushError } from "./core.error";
import {
  finalizePushDeliveryGate,
  invalidateDeadSubscriptions,
  reservePushDeliveryGate,
} from "./core.delivery-gate";
import {
  addFailureCount,
  countDeadEndpointGroups,
  dedupeSubscriptionsByEndpoint,
  mapWithConcurrency,
  resolvePushFanoutRuntimeConfig,
  waitForRetry,
} from "./core.runtime";
import {
  PushSendOutcome,
  PushRole,
  PushTarget,
  SubscriptionRecord,
} from "./core.types";

export type { PushRole, PushTarget, SubscriptionRecord } from "./core.types";

export async function fetchActiveSubscriptions(
  where: Prisma.SubscriptionWhereInput,
  label: string
) {
  const startedAt = startPushTimer();
  const raw = await db.subscription.findMany({
    where: { ...where, invalidatedAt: null },
    select: { endpoint: true, auth: true, p256dh: true },
  });
  const deduped = dedupeSubscriptionsByEndpoint(raw);
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
  const { concurrency, retryCount, dedupeEnabled, deadCleanupEnabled } =
    resolvePushFanoutRuntimeConfig();

  const deliveryGate = dedupeEnabled
    ? await reservePushDeliveryGate(eventKey, role, target)
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
            await waitForRetry(60 * attempt);
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
    deadEndpointCount: countDeadEndpointGroups(deadByStatus),
    failureByType,
    elapsedMs: elapsedPushMs(startedAt),
  });
}
