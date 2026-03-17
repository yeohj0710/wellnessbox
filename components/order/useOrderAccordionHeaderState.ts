"use client";

import { useMemo, useState } from "react";
import { generateOrderNumber } from "@/lib/order/orderNumber";
import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type { OrderAccordionOrder } from "./orderAccordion.types";

function formatOrderCreatedAt(value: OrderAccordionOrder["createdAt"]) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useOrderAccordionHeaderState(input: {
  role: "customer" | "pharmacist" | "rider";
  order: OrderAccordionOrder;
  onBack?: () => void;
}) {
  const { role, order, onBack } = input;
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [allReviewsCompleted, setAllReviewsCompleted] = useState(() =>
    order.orderItems.every((item) => item.review?.rate)
  );

  const firstPharmacyProduct = order.orderItems[0]?.pharmacyProduct;
  const firstProductName = firstPharmacyProduct?.product?.name || "주문 상품";
  const firstOptionType = firstPharmacyProduct?.optionType || "-";
  const additionalItemCount = Math.max(0, order.orderItems.length - 1);
  const orderNumberLabel = useMemo(
    () => generateOrderNumber(order.id),
    [order.id]
  );
  const createdAtLabel = useMemo(
    () => formatOrderCreatedAt(order.createdAt),
    [order.createdAt]
  );
  const canWriteReview =
    role === "customer" &&
    Boolean(onBack) &&
    order.status === ORDER_STATUS.DELIVERY_COMPLETE;

  const openReviewModal = () => {
    if (allReviewsCompleted) return;
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
  };

  return {
    isReviewModalOpen,
    allReviewsCompleted,
    setAllReviewsCompleted,
    firstProductName,
    firstOptionType,
    additionalItemCount,
    orderNumberLabel,
    createdAtLabel,
    canWriteReview,
    openReviewModal,
    closeReviewModal,
  };
}
