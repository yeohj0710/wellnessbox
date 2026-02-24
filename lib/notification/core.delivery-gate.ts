import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { pushLog } from "@/lib/push/logging";
import {
  isPrismaUniqueConstraintError,
  isPushDeliveryTableMissingError,
} from "@/lib/notification/core.error";
import { PushRole, PushTarget } from "@/lib/notification/core.types";

let pushDeliveryTableAvailable = true;

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

export type PushDeliveryGateReservation = {
  trackingEnabled: boolean;
  deduped: boolean;
};

export async function reservePushDeliveryGate(
  eventKey: string,
  role: PushRole,
  target: PushTarget
): Promise<PushDeliveryGateReservation> {
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

export async function finalizePushDeliveryGate(
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

export async function invalidateDeadSubscriptions(
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
