import React from "react";
import { ORDER_STATUS, OrderStatus } from "@/lib/order/orderStatus";

const StatusLabel: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const statusColors: Record<OrderStatus, string> = {
    [ORDER_STATUS.PAYMENT_COMPLETE]: "text-emerald-500",
    [ORDER_STATUS.COUNSEL_COMPLETE]: "text-indigo-500",
    [ORDER_STATUS.DISPENSE_COMPLETE]: "text-yellow-500",
    [ORDER_STATUS.PICKUP_COMPLETE]: "text-orange-400",
    [ORDER_STATUS.DELIVERY_COMPLETE]: "text-gray-500",
    [ORDER_STATUS.CANCELED]: "text-red-600",
  };
  const nextSteps: Record<OrderStatus, string> = {
    [ORDER_STATUS.PAYMENT_COMPLETE]: "상담 진행 중",
    [ORDER_STATUS.COUNSEL_COMPLETE]: "조제 진행 중",
    [ORDER_STATUS.DISPENSE_COMPLETE]: "배송 대기 중",
    [ORDER_STATUS.PICKUP_COMPLETE]: "배송 중",
    [ORDER_STATUS.DELIVERY_COMPLETE]: "배송 완료",
    [ORDER_STATUS.CANCELED]: "주문 취소",
  };
  const colorClass = `${statusColors[status] || "text-gray-500"} font-bold`;
  const nextStatus = nextSteps[status] || "알 수 없음";
  return <span className={colorClass}>{nextStatus}</span>;
};

export default StatusLabel;
