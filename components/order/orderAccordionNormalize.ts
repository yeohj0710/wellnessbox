import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import type { OrderAccordionOrder } from "./orderAccordion.types";

export function toOrderStatus(value: unknown): OrderStatus {
  if (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  ) {
    return value as OrderStatus;
  }
  return ORDER_STATUS.PAYMENT_COMPLETE;
}

export function normalizeOrderSummary(rawOrder: unknown): OrderAccordionOrder {
  const orderRecord = rawOrder as Record<string, unknown> | null;

  const rawItems = Array.isArray(orderRecord?.orderItems)
    ? orderRecord.orderItems
    : [];

  const normalizedItems = rawItems.map((rawItem) => {
    const item = rawItem as Record<string, unknown> | null;
    const pharmacyProduct = item?.pharmacyProduct as
      | Record<string, unknown>
      | null
      | undefined;
    const product = pharmacyProduct?.product as
      | Record<string, unknown>
      | null
      | undefined;
    const review = item?.review as Record<string, unknown> | null | undefined;

    return {
      id: typeof item?.id === "number" ? item.id : undefined,
      quantity: typeof item?.quantity === "number" ? item.quantity : 0,
      pharmacyProduct: pharmacyProduct
        ? {
            optionType:
              typeof pharmacyProduct.optionType === "string"
                ? pharmacyProduct.optionType
                : null,
            price:
              typeof pharmacyProduct.price === "number"
                ? pharmacyProduct.price
                : null,
            product: product
              ? {
                  name: typeof product.name === "string" ? product.name : null,
                  images: Array.isArray(product.images)
                    ? (product.images as string[])
                    : [],
                  categories: Array.isArray(product.categories)
                    ? (product.categories as Array<{ name: string | null }>)
                    : [],
                }
              : null,
          }
        : null,
      review: review
        ? {
            rate: typeof review.rate === "number" ? review.rate : null,
            content: typeof review.content === "string" ? review.content : null,
          }
        : null,
    };
  });

  const pharmacy = orderRecord?.pharmacy as Record<string, unknown> | null | undefined;

  return {
    id: typeof orderRecord?.id === "number" ? orderRecord.id : 0,
    status: toOrderStatus(orderRecord?.status),
    createdAt: (orderRecord?.createdAt as string | number | Date | null) ?? new Date(),
    orderItems: normalizedItems,
    totalPrice:
      typeof orderRecord?.totalPrice === "number" ? orderRecord.totalPrice : undefined,
    roadAddress:
      typeof orderRecord?.roadAddress === "string"
        ? orderRecord.roadAddress
        : undefined,
    detailAddress:
      typeof orderRecord?.detailAddress === "string"
        ? orderRecord.detailAddress
        : undefined,
    phone: typeof orderRecord?.phone === "string" ? orderRecord.phone : undefined,
    requestNotes:
      typeof orderRecord?.requestNotes === "string"
        ? orderRecord.requestNotes
        : null,
    entrancePassword:
      typeof orderRecord?.entrancePassword === "string"
        ? orderRecord.entrancePassword
        : null,
    directions:
      typeof orderRecord?.directions === "string" ? orderRecord.directions : null,
    pharmacy: pharmacy
      ? {
          id: typeof pharmacy.id === "number" ? pharmacy.id : undefined,
          name: typeof pharmacy.name === "string" ? pharmacy.name : undefined,
          address:
            typeof pharmacy.address === "string" ? pharmacy.address : undefined,
          phone: typeof pharmacy.phone === "string" ? pharmacy.phone : undefined,
        }
      : null,
  };
}
