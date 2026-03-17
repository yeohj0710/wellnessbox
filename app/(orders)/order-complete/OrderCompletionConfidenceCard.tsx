"use client";

import PurchaseRetentionCard from "@/components/order/PurchaseRetentionCard";
import { buildOrderConfidence } from "@/lib/order/purchase-retention";
import type { OrderRecord } from "./orderComplete.types";

export default function OrderCompletionConfidenceCard({
  order,
}: {
  order: OrderRecord;
}) {
  const model = buildOrderConfidence({
    status: order.status ?? "",
    totalPrice: Number(order.totalPrice ?? 0),
    itemCount: Array.isArray(order.orderItems) ? order.orderItems.length : 0,
    roadAddress: order.roadAddress,
    phone: order.phone,
    requestNotes: order.requestNotes,
    entrancePassword: order.entrancePassword,
    directions: order.directions,
  });

  return (
    <PurchaseRetentionCard
      model={model}
      className="mx-2 mt-4 sm:mx-0"
      hideBehindBeta={false}
    />
  );
}
