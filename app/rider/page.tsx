"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  updateOrderStatus,
  getOrderById,
  getOrderStatusById,
  getBasicOrdersByRider,
} from "@/lib/order";
import { useRouter } from "next/navigation";
import OrderProgressBar from "@/components/orderProgressBar";
import OrderAccordionHeader from "@/components/orderAccordionHeader";
import FullPageLoader from "@/components/fullPageLoader";
import { getRider } from "@/lib/rider";

export default function Rider() {
  const [loading, setLoading] = useState<boolean>(true);
  const [rider, setRider] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();
  useEffect(() => {
    async function fetchRider() {
      const rider = await getRider();
      if (!rider) {
        router.push("/rider-login");
      } else {
        setRider(rider);
      }
    }
    fetchRider();
  }, [router]);
  useEffect(() => {
    if (!rider) return;
    async function fetchOrders() {
      const fetchedOrders = await getBasicOrdersByRider();
      setOrders(fetchedOrders);
      setLoading(false);
    }
    fetchOrders();
  }, [rider]);
  const OrderAccordionItem = ({
    initialOrder,
    isInitiallyExpanded,
  }: {
    initialOrder: any;
    isInitiallyExpanded: boolean;
  }) => {
    const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
    const [order, setOrder] = useState(initialOrder);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
    const [isStateRefreshing, setIsStateRefreshing] = useState(false);
    useEffect(() => {
      if (!isExpanded || isLoaded) return;
      async function fetchDetails() {
        const detailedOrder = await getOrderById(initialOrder.idx);
        setOrder(detailedOrder);
        setIsLoaded(true);
      }
      fetchDetails();
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded || !isLoaded) return;
      const intervalId = setInterval(() => {
        refreshOrderStatus();
      }, 10000);
      return () => clearInterval(intervalId);
    }, [isExpanded, isLoaded]);
    const toggleExpanded = () => {
      setIsExpanded((prev) => !prev);
    };
    const refreshOrderStatus = async (manual: boolean = false) => {
      try {
        const updatedStatus = await getOrderStatusById(order.idx);
        setOrder((prev: any) => ({
          ...prev,
          status: updatedStatus?.status,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        if (manual) setIsStateRefreshing(false);
      }
    };
    const handleUpdateOrderStatus = async (
      orderIdx: number,
      newStatus: string
    ) => {
      setLoadingStatus(orderIdx);
      const updatedOrder = await updateOrderStatus(orderIdx, newStatus);
      setOrder((prevOrder: any) => ({
        ...prevOrder,
        ...updatedOrder,
      }));
      setLoadingStatus(null);
    };
    if (isExpanded && !isLoaded) {
      return (
        <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
          <OrderAccordionHeader
            order={order}
            isExpanded={isExpanded}
            toggle={toggleExpanded}
          />
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <div className="flex justify-center items-center mt-2 mb-6">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
        <OrderAccordionHeader
          order={order}
          isExpanded={isExpanded}
          toggle={toggleExpanded}
        />
        {isExpanded && (
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <OrderProgressBar currentStatus={order.status} />
            <div className="flex flex-col sm:flex-row justify-between sm:gap-8 mt-12 mb-6">
              <span className="text-lg font-bold text-gray-700">
                주문 상태 변경
              </span>
              <div className="flex gap-2 mt-4 sm:mt-0">
                <button
                  onClick={() =>
                    handleUpdateOrderStatus(order.idx, "픽업 완료")
                  }
                  className="text-sm flex justify-center items-center w-20 h-8 bg-orange-400 hover:bg-orange-500 text-white rounded"
                  disabled={loadingStatus === order.idx}
                >
                  {loadingStatus === order.idx ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "픽업 완료"
                  )}
                </button>
                <button
                  onClick={() =>
                    handleUpdateOrderStatus(order.idx, "배송 완료")
                  }
                  className="text-sm flex justify-center items-center w-20 h-8 bg-gray-400 hover:bg-gray-500 text-white rounded"
                  disabled={loadingStatus === order.idx}
                >
                  {loadingStatus === order.idx ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "배송 완료"
                  )}
                </button>
                <button
                  onClick={() => {
                    const confirmCancel =
                      window.confirm("정말로 픽업을 취소하시겠습니까?");
                    if (confirmCancel) {
                      handleUpdateOrderStatus(order.idx, "조제 완료");
                    }
                  }}
                  className="text-sm flex justify-center items-center w-20 h-8 bg-red-400 hover:bg-red-500 text-white rounded"
                  disabled={loadingStatus === order.idx}
                >
                  {loadingStatus === order.idx ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "픽업 취소"
                  )}
                </button>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-700 mb-4 mt-4">
                주문 상세 내역
              </h2>
              {order.orderItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between mb-6"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.product.images?.[0] || "/placeholder.png"}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {item.product.categories?.length
                          ? item.product.categories
                              .map((category: any) => category.name)
                              .join(", ")
                          : "옵션 없음"}
                      </p>
                      <p className="text-sm font-bold text-sky-400 mt-1">
                        ₩{item.product.price.toLocaleString()} x
                        <span className="text-rose-600"> {item.quantity}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-sky-400">
                    ₩{(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
              <div className="flex justify-end text-sm text-gray-600">
                <span>배송비</span>
                <span className="font-bold ml-2">₩3,000</span>
              </div>
              <div className="flex justify-end gap-2 text-base font-bold mt-2">
                <span className="text-gray-700">총 결제 금액</span>
                <span className="text-sky-400">
                  ₩{order.totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
            <h3 className="mb-2 font-bold mt-4 border-t pt-4">약국 정보</h3>
            <div className="flex flex-col text-sm gap-1 mt-8 mb-6">
              <div className="flex items-center">
                <span className="w-20 font-bold text-gray-500">약국명</span>
                <span className="flex-1 text-gray-800">
                  {order.pharmacy?.name}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-20 font-bold text-gray-500">약국 주소</span>
                <span className="flex-1 text-gray-800">
                  {order.pharmacy?.address}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-20 font-bold text-gray-500">전화번호</span>
                <span className="flex-1 text-gray-800">
                  {order.pharmacy?.phone}
                </span>
              </div>
            </div>
            <h3 className="mb-2 font-bold mt-4 border-t pt-4">주문자 정보</h3>
            <div className="flex flex-col text-sm gap-1 mt-4">
              <div className="flex items-center">
                <span className="w-32 font-bold text-gray-500">주소</span>
                <span className="flex-1 text-gray-800">
                  {order.roadAddress} {order.detailAddress}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-32 font-bold text-gray-500">연락처</span>
                <span className="flex-1 text-gray-800">{order.phone}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 font-bold text-gray-500">주문일시</span>
                <span className="flex-1 text-gray-800">
                  {order.createdAt.toLocaleString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-32 font-bold text-gray-500">
                  배송 시 요청 사항
                </span>
                <span className="flex-1 text-gray-800">
                  {order.requestNotes || "없음"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-32 font-bold text-gray-500">
                  공동현관 비밀번호
                </span>
                <span className="flex-1 text-gray-800">
                  {order.entrancePassword || "없음"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-32 font-bold text-gray-500">
                  찾아오는 길 안내
                </span>
                <span className="flex-1 text-gray-800">
                  {order.directions || "없음"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  if (loading) return <FullPageLoader />;
  return (
    <div className="w-full mt-8 mb-12 flex flex-col gap-4">
      {orders.map((order: any, index: number) => (
        <OrderAccordionItem
          key={order.idx}
          initialOrder={order}
          isInitiallyExpanded={index === 0}
        />
      ))}
    </div>
  );
}
