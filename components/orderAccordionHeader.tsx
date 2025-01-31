"use client";

import React, { useEffect, useState } from "react";
import { generateOrderNumber } from "@/lib/orderNumber";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import StatusLabel from "./statusLabel";
import ReviewModal from "./reviewModal";

export default function OrderAccordionHeader({
  order,
  isExpanded,
  toggle,
  onBack,
}: any) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const firstPharmacyProduct = order.orderItems[0].pharmacyProduct;
  const [allReviewsCompleted, setAllReviewsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const isAllReviewsCompleted = order.orderItems.every(
      (item: any) => item.review && item.review.rate
    );
    setAllReviewsCompleted(isAllReviewsCompleted);
    setIsLoading(false);
  }, [order]);
  return (
    <>
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={toggle}
      >
        <div className="flex flex-col">
          <div className="text-sm text-gray-500">
            주문번호 #{generateOrderNumber(order.id)}
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold text-gray-700">
            {firstPharmacyProduct.product.name} (
            {firstPharmacyProduct.optionType})
            {order.orderItems.length > 1 && (
              <span className="text-gray-500 text-sm">
                {` 외 ${order.orderItems.length - 1}개`}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-row items-center gap-2 sm:gap-6 text-sm text-gray-500">
            <span>
              주문일시:{" "}
              <span className="text-gray-700">
                {order.createdAt.toLocaleString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
            <span className="hidden sm:inline">
              <StatusLabel status={order.status} />
            </span>
            {!isLoading && onBack && order.status === "배송 완료" && (
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!allReviewsCompleted) {
                      setIsReviewModalOpen(true);
                    }
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
            )}
          </div>
        </div>
        <span className="w-6 h-6">
          {isExpanded ? (
            <ChevronUpIcon className="text-gray-600" />
          ) : (
            <ChevronDownIcon className="text-gray-600" />
          )}
        </span>
      </div>
      {isReviewModalOpen && (
        <ReviewModal
          initialOrder={order}
          onClose={() => setIsReviewModalOpen(false)}
          setAllReviewsCompleted={setAllReviewsCompleted}
        />
      )}
    </>
  );
}
