import React from "react";

const StatusLabel: React.FC<any> = ({ status }: any) => {
  const statusColors: { [key: string]: string } = {
    "결제 완료": "text-emerald-500",
    "상담 완료": "text-indigo-500",
    "조제 완료": "text-yellow-500",
    "픽업 완료": "text-orange-400",
    "배송 완료": "text-gray-500",
    "주문 취소": "text-red-600",
  };
  const nextSteps: { [key: string]: string } = {
    "결제 완료": "상담 진행 중",
    "상담 완료": "조제 진행 중",
    "조제 완료": "배송 대기 중",
    "픽업 완료": "배송 중",
    "배송 완료": "배송 완료",
    "주문 취소": "주문 취소",
  };
  const colorClass = `${statusColors[status] || "text-gray-500"} font-bold`;
  const nextStatus = nextSteps[status] || "알 수 없음";
  return <span className={colorClass}>{nextStatus}</span>;
};

export default StatusLabel;
