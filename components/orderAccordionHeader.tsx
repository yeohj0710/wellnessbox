import React from "react";
import { generateOrderNumber } from "@/lib/orderNumber";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import StatusLabel from "./statusLabel";

type OrderAccordionHeaderProps = {
  order: any;
  isExpanded: boolean;
  toggle: () => void;
};

export default function OrderAccordionHeader({
  order,
  isExpanded,
  toggle,
}: OrderAccordionHeaderProps) {
  return (
    <div
      className="flex justify-between items-center cursor-pointer"
      onClick={toggle}
    >
      <div className="flex flex-col">
        <div className="text-sm text-gray-500">
          주문번호 #{generateOrderNumber(order.id)}
        </div>
        <div className="mt-1 text-sm sm:text-base font-bold text-gray-700">
          {order.orderItems[0].pharmacyProduct.product.name}
          {order.orderItems.length > 1 && (
            <span className="text-gray-500 text-sm">
              {` 외 ${order.orderItems.length - 1}개`}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-row gap-2 sm:gap-6 text-sm text-gray-500">
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
          <span>
            <StatusLabel status={order.status} />
          </span>
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
  );
}
