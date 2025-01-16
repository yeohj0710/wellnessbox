"use client";

import React, { useEffect, useState } from "react";
import {
  getOrders,
  updateOrderStatus,
  getOrderById,
  getOrderStatusById,
} from "@/lib/order";
import { generateOrderNumber } from "@/lib/orderNumber";

export default function RiderPage() {
  const [riderOrders, setRiderOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRiderOrders();
  }, []);
  const fetchRiderOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getOrders();

      const filtered = allOrders.filter(
        (order: any) =>
          order.status === "조제 완료" ||
          order.status === "픽업 완료" ||
          order.status === "배송 완료"
      );
      setRiderOrders(filtered);
    } catch (error) {
      console.error(error);
      alert("주문 정보를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const steps = [
    { label: "결제 완료" },
    { label: "상담 완료" },
    { label: "조제 완료" },
    { label: "픽업 완료" },
    { label: "배송 완료" },
  ];
  const getStatusClass = (step: number, currentStatus: string) => {
    const currentStepIndex =
      steps.findIndex((s) => s.label === currentStatus) + 1;
    return step < currentStepIndex
      ? "bg-sky-400 text-white"
      : step === currentStepIndex
      ? "bg-sky-400 text-white"
      : "bg-gray-200 text-gray-500";
  };
  const getLineClass = (step: number, currentStatus: string) => {
    const currentStepIndex =
      steps.findIndex((s) => s.label === currentStatus) + 1;
    return step < currentStepIndex
      ? "bg-sky-400"
      : step === currentStepIndex
      ? "bg-sky-400 animate-pulse shadow-lg"
      : "bg-gray-200";
  };
  const getLineText = (step: number) => {
    switch (step) {
      case 1:
        return "상담 진행 중";
      case 2:
        return "조제 진행 중";
      case 3:
        return "배송 대기 중";
      case 4:
        return "배송 중";
      default:
        return "진행 중";
    }
  };
  const RiderOrderAccordionItem = ({
    initialOrder,
    isInitiallyExpanded,
  }: {
    initialOrder: any;
    isInitiallyExpanded: boolean;
  }) => {
    const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [order, setOrder] = useState<any>(initialOrder);
    const [updatingOrderIdx, setUpdatingOrderIdx] = useState<number | null>(
      null
    );
    const [isStateRefreshing, setIsStateRefreshing] = useState(false);
    useEffect(() => {
      if (!isExpanded) return;
      async function fetchDetails() {
        try {
          const detailed = await getOrderById(initialOrder.idx);
          setOrder(detailed);
        } catch (error) {
          console.error(error);
        } finally {
          setLoadingDetails(false);
        }
      }
      fetchDetails();
    }, [isExpanded, initialOrder.idx]);
    useEffect(() => {
      if (!isExpanded) return;
      const intervalId = setInterval(() => {
        refreshOrderStatus();
      }, 10000);
      return () => clearInterval(intervalId);
    }, [order, isExpanded]);
    const handleUpdateStatus = async (orderIdx: number, newStatus: string) => {
      try {
        setUpdatingOrderIdx(orderIdx);
        const updatedOrder = await updateOrderStatus(orderIdx, newStatus);
        setOrder((prev: any) => ({
          ...prev,
          status: updatedOrder.status,
          updatedAt: updatedOrder.updatedAt,
        }));
      } catch (error) {
        console.error(error);
        alert("주문 상태 업데이트에 실패했습니다.");
      } finally {
        setUpdatingOrderIdx(null);
      }
    };
    const refreshOrderStatus = async (manual: boolean = false) => {
      if (!isExpanded) return;
      if (manual) setIsStateRefreshing(true);
      try {
        const updatedStatus = await getOrderStatusById(order.idx);
        setOrder((prev: any) => ({
          ...prev,
          status: updatedStatus?.status,
        }));
      } catch (error) {
        console.error(error);
      } finally {
        if (manual) setIsStateRefreshing(false);
      }
    };
    const toggleExpanded = () => {
      setIsExpanded((prev) => !prev);
    };
    return (
      <div className="w-full max-w-[640px] mx-auto p-3 border rounded-lg transition bg-white hover:bg-gray-50">
        <div
          className="flex justify-between items-start cursor-pointer"
          onClick={toggleExpanded}
        >
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold text-gray-800 mb-1">
              주문 번호:{" "}
              <span className="text-sky-500">
                {generateOrderNumber(order.idx)}
              </span>
            </p>
            <p className="text-sm text-gray-700">
              상태: <span className="font-bold">{order.status} </span>
            </p>
          </div>
          <div className="text-sm text-sky-400 mt-1">
            {isExpanded ? "접기 ▲" : "펼치기 ▼"}
          </div>
        </div>
        {isExpanded && (
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            {loadingDetails ? (
              <div className="flex justify-center items-center mb-6">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-6">
                  {steps.map((step, stepIndex) => (
                    <React.Fragment key={stepIndex}>
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold ${getStatusClass(
                            stepIndex + 1,
                            order.status
                          )}`}
                        >
                          {stepIndex + 1}
                        </div>
                        <span className="whitespace-nowrap mt-2 text-xs text-center">
                          {step.label}
                        </span>
                      </div>
                      {stepIndex < steps.length - 1 && (
                        <div className="relative flex items-center justify-center flex-1">
                          <div
                            className={`mb-5 h-1 w-full ${getLineClass(
                              stepIndex + 1,
                              order.status
                            )}`}
                          />
                          <span className="absolute text-center bottom-[28px] text-xs text-gray-500">
                            {getLineText(stepIndex + 1)}
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(order.idx, "조제 완료")}
                    className="w-28 h-9 bg-yellow-500 text-white rounded text-sm flex items-center justify-center shadow-sm hover:bg-yellow-600 transition"
                    disabled={
                      updatingOrderIdx === order.idx ||
                      order.status === "조제 완료"
                    }
                  >
                    {updatingOrderIdx === order.idx &&
                    order.status !== "조제 완료" ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "조제 완료"
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.idx, "픽업 완료")}
                    className="w-28 h-9 bg-sky-500 text-white rounded text-sm flex items-center justify-center shadow-sm hover:bg-sky-600 transition"
                    disabled={updatingOrderIdx === order.idx}
                  >
                    {updatingOrderIdx === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "픽업 완료"
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.idx, "배송 완료")}
                    className="w-28 h-9 bg-green-500 text-white rounded text-sm flex items-center justify-center shadow-sm hover:bg-green-600 transition"
                    disabled={updatingOrderIdx === order.idx}
                  >
                    {updatingOrderIdx === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "배송 완료"
                    )}
                  </button>
                  <button
                    onClick={() => refreshOrderStatus(true)}
                    className="w-20 h-9 bg-gray-300 text-gray-700 rounded text-sm flex items-center justify-center shadow-sm hover:bg-gray-400 transition"
                  >
                    {isStateRefreshing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "새로고침"
                    )}
                  </button>
                </div>
                <div className="p-4 mb-4 bg-gray-50 rounded-lg shadow-sm">
                  <p className="text-sm font-semibold text-gray-700">약국명</p>
                  <p className="text-sm text-gray-800 mb-2">
                    {order.pharmacy?.name || "정보 없음"}
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    약국 주소
                  </p>
                  <p className="text-sm text-gray-800 mb-2">
                    {order.pharmacy?.address || "정보 없음"}
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    약국 전화번호
                  </p>
                  <p className="text-sm text-gray-800 mb-2">
                    {order.pharmacy?.phone || "정보 없음"}
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    배송지 주소
                  </p>
                  <p className="text-sm text-gray-800 mb-2">
                    {order.roadAddress} {order.detailAddress}
                  </p>
                  <p className="text-sm text-gray-800">
                    총 결제 금액:{" "}
                    <span className="text-base font-bold text-sky-500">
                      ₩{order.totalPrice?.toLocaleString()}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    최종 업데이트:{" "}
                    {new Date(order.updatedAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>주문자 전화번호: {order.phone}</p>
                    <p>배송 시 요청 사항: {order.requestNotes || "없음"}</p>
                    <p>공동현관 비밀번호: {order.entrancePassword || "없음"}</p>
                    <p>찾아오는 길 안내: {order.directions || "없음"}</p>
                  </div>
                </div>
                {order?.orderItems?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-gray-800 mb-2">
                      주문 내역
                    </h3>
                    <ul className="space-y-2">
                      {order.orderItems.map((item: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700">
                          <span className="font-semibold">
                            {item.product.name}
                          </span>{" "}
                          x {item.quantity} 개
                          <span className="ml-2 text-sky-400">
                            ₩
                            {(
                              item.product.price * item.quantity
                            )?.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center w-full h-20">
        <div className="mt-8 w-6 h-6 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="w-full mt-8 mb-10 flex flex-col gap-4">
      {riderOrders.map((order: any, index: number) => (
        <RiderOrderAccordionItem
          key={order.idx}
          initialOrder={order}
          isInitiallyExpanded={index === 0}
        />
      ))}
    </div>
  );
}
