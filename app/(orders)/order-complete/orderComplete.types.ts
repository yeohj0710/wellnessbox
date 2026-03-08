import type { getOrderByPaymentId } from "@/lib/order/queries";

export type OrderRecord = NonNullable<
  Awaited<ReturnType<typeof getOrderByPaymentId>>
>;

export type SubscriptionInfo = {
  endpoint: string;
};
