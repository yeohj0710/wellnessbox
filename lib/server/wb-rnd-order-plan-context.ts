import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";

export type WbRndOrderPlanContext = {
  schema_version: "order_plan_context_request_v1";
  execution_id: string;
  profile_id: string;
  plan_id: string;
  order_id: number;
  order_status: string;
  packaging_state: "PENDING" | "COMPLETE" | "CANCELED";
  delivery_state: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "CANCELED";
  reorder_state: "NOT_ELIGIBLE" | "ELIGIBLE" | "CANCELED";
  cancellation_state: "ACTIVE" | "CANCELED";
  observed_at: string;
};

export type OrderPlanContextSource = {
  id: number;
  status: string | null;
  updatedAt: Date;
};

function requireOrderStatus(value: string | null): OrderStatus {
  if (!value || !(Object.values(ORDER_STATUS) as string[]).includes(value)) {
    throw new Error("WB_RND_ORDER_CONTEXT_unknown_order_status");
  }
  return value as OrderStatus;
}

export function mapOrderToReadOnlyPlanContext(input: {
  order: OrderPlanContextSource;
  executionId: string;
  profileId: string;
  planId: string;
}): WbRndOrderPlanContext {
  const status = requireOrderStatus(input.order.status);
  const canceled = status === ORDER_STATUS.CANCELED;
  const packagedStatuses: OrderStatus[] = [
    ORDER_STATUS.DISPENSE_COMPLETE,
    ORDER_STATUS.PICKUP_COMPLETE,
    ORDER_STATUS.DELIVERY_COMPLETE,
  ];
  const packaged = packagedStatuses.includes(status);
  const inTransit = status === ORDER_STATUS.PICKUP_COMPLETE;
  const delivered = status === ORDER_STATUS.DELIVERY_COMPLETE;

  return {
    schema_version: "order_plan_context_request_v1",
    execution_id: input.executionId,
    profile_id: input.profileId,
    plan_id: input.planId,
    order_id: input.order.id,
    order_status: status,
    packaging_state: canceled ? "CANCELED" : packaged ? "COMPLETE" : "PENDING",
    delivery_state: canceled
      ? "CANCELED"
      : delivered
        ? "DELIVERED"
        : inTransit
          ? "IN_TRANSIT"
          : "PENDING",
    reorder_state: canceled ? "CANCELED" : delivered ? "ELIGIBLE" : "NOT_ELIGIBLE",
    cancellation_state: canceled ? "CANCELED" : "ACTIVE",
    observed_at: input.order.updatedAt.toISOString(),
  };
}
