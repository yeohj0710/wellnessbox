"use client";

import React from "react";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  BellIcon,
  BellSlashIcon,
} from "@heroicons/react/24/outline";
import StatusLabel from "@/components/common/statusLabel";
import ReviewModal from "@/components/modal/reviewModal";
import type { OrderAccordionOrder } from "./orderAccordion.types";
import { useOrderAccordionHeaderState } from "./useOrderAccordionHeaderState";

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
  const {
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
  } = useOrderAccordionHeaderState({
    role,
    order,
    onBack,
  });

  return (
    <>
      <div className="relative cursor-pointer" onClick={toggle}>
        {toggleSubscription ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleSubscription();
            }}
            className={`absolute right-0 top-0 inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs sm:text-sm ${
              isSubscribed
                ? "bg-sky-50 text-sky-600 hover:bg-sky-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } ${subscriptionLoading ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={subscriptionLoading}
          >
            {subscriptionLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isSubscribed ? (
              <BellIcon className="h-4 w-4" />
            ) : (
              <BellSlashIcon className="h-4 w-4" />
            )}
            <span className="whitespace-nowrap">{isSubscribed ? "켜짐" : "꺼짐"}</span>
          </button>
        ) : null}

        <span
          className={`absolute right-0 ${
            toggleSubscription ? "top-[55%]" : "top-1/2"
          } flex h-6 w-6 -translate-y-1/2 items-center justify-center`}
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-6 w-6 text-gray-600" />
          ) : (
            <ChevronDownIcon className="h-6 w-6 text-gray-600" />
          )}
        </span>

        <div className="flex flex-col gap-1 pr-8 sm:pr-0">
          <div className="text-sm text-gray-500">주문번호 #{orderNumberLabel}</div>

          <div className="mt-2 text-sm font-bold text-gray-700 sm:text-base">
            {firstProductName} ({firstOptionType})
            {additionalItemCount > 0 ? (
              <span className="text-sm text-gray-500">{` 외 ${additionalItemCount}개`}</span>
            ) : null}
          </div>

          <div className="mt-2.5 flex flex-row items-center gap-2 text-sm text-gray-500 sm:gap-6">
            <span>
              주문일시: <span className="text-gray-700">{createdAtLabel}</span>
            </span>
            <span className="hidden sm:inline">
              <StatusLabel status={order.status} />
            </span>
            {canWriteReview ? (
              <div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    openReviewModal();
                  }}
                  className={`-my-2 ml-2 rounded px-3 py-1 sm:ml-0 ${
                    allReviewsCompleted
                      ? "cursor-default bg-gray-300 text-gray-500"
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
          onClose={closeReviewModal}
          setAllReviewsCompleted={setAllReviewsCompleted}
        />
      ) : null}
    </>
  );
}
