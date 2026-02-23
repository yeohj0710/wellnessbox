"use client";

import React, { useEffect, useState } from "react";
import { generateOrderNumber } from "@/lib/order/orderNumber";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  BellIcon,
  BellSlashIcon,
} from "@heroicons/react/24/outline";
import StatusLabel from "@/components/common/statusLabel";
import ReviewModal from "@/components/modal/reviewModal";
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

interface OrderAccordionHeaderProps {
  role: "customer" | "pharmacist" | "rider";
  order: OrderAccordionOrder;
  isExpanded: boolean;
  toggle: () => void;
  onBack?: () => void;
  isSubscribed?: boolean;
  toggleSubscription?: () => void;
  subscriptionLoading?: boolean;
}

export default function OrderAccordionHeader({
  role,
  order,
  isExpanded,
  toggle,
  onBack,
  isSubscribed,
  toggleSubscription,
  subscriptionLoading,
}: OrderAccordionHeaderProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [allReviewsCompleted, setAllReviewsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const firstPharmacyProduct = order.orderItems[0]?.pharmacyProduct;
  const firstProductName = firstPharmacyProduct?.product?.name || "주문 상품";
  const firstOptionType = firstPharmacyProduct?.optionType || "-";

  useEffect(() => {
    const isAllReviewsCompleted = order.orderItems.every(
      (item) => item.review && item.review.rate
    );
    setAllReviewsCompleted(isAllReviewsCompleted);
    setIsLoading(false);
  }, [order]);

  return (
    <>
      <div className="relative cursor-pointer" onClick={toggle}>
        {toggleSubscription ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleSubscription();
            }}
            className={`absolute top-0 right-0 inline-flex items-center gap-1 rounded px-2 py-1 text-xs sm:text-sm whitespace-nowrap ${
              isSubscribed
                ? "bg-sky-50 text-sky-600 hover:bg-sky-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } ${subscriptionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={subscriptionLoading}
          >
            {subscriptionLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isSubscribed ? (
              <BellIcon className="w-4 h-4" />
            ) : (
              <BellSlashIcon className="w-4 h-4" />
            )}
            <span className="whitespace-nowrap">{isSubscribed ? "켜짐" : "꺼짐"}</span>
          </button>
        ) : null}

        <span
          className={`absolute right-0 ${
            toggleSubscription ? "top-[55%]" : "top-1/2"
          } -translate-y-1/2 w-6 h-6 flex items-center justify-center`}
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDownIcon className="w-6 h-6 text-gray-600" />
          )}
        </span>

        <div className="flex flex-col gap-1 pr-8 sm:pr-0">
          <div className="text-sm text-gray-500">
            주문번호 #{generateOrderNumber(order.id)}
          </div>

          <div className="mt-2 text-sm sm:text-base font-bold text-gray-700">
            {firstProductName} ({firstOptionType})
            {order.orderItems.length > 1 ? (
              <span className="text-gray-500 text-sm">{` 외 ${
                order.orderItems.length - 1
              }개`}</span>
            ) : null}
          </div>

          <div className="mt-2.5 flex flex-row items-center gap-2 sm:gap-6 text-sm text-gray-500">
            <span>
              주문일시:{" "}
              <span className="text-gray-700">
                {formatOrderCreatedAt(order.createdAt)}
              </span>
            </span>
            <span className="hidden sm:inline">
              <StatusLabel status={order.status} />
            </span>
            {!isLoading &&
            role === "customer" &&
            onBack &&
            order.status === ORDER_STATUS.DELIVERY_COMPLETE ? (
              <div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!allReviewsCompleted) setIsReviewModalOpen(true);
                  }}
                  className={`px-3 py-1 ml-2 sm:ml-0 -my-2 rounded ${
                    allReviewsCompleted
                      ? "bg-gray-300 text-gray-500 cursor-default"
                      : "bg-sky-400 text-white hover:bg-sky-500"
                  }`}
                  disabled={allReviewsCompleted}
                >
                  {allReviewsCompleted ? "리뷰 완료" : "리뷰 작성"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isReviewModalOpen ? (
        <ReviewModal
          initialOrder={order}
          onClose={() => setIsReviewModalOpen(false)}
          setAllReviewsCompleted={setAllReviewsCompleted}
        />
      ) : null}
    </>
  );
}
