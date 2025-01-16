"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getOrdersByPharmacy,
  updateOrderStatus,
  getOrderById,
  getOrderStatusById,
} from "@/lib/order";
import { createMessage, getMessagesByOrder } from "@/lib/message";
import { getPharmacy } from "@/lib/pharmacy";
import { useRouter } from "next/navigation";
import { generateOrderNumber } from "@/lib/orderNumber";
import StatusLabel from "@/components/statusLabel";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function Pharm() {
  const [pharm, setPharm] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();
  useEffect(() => {
    async function fetchPharmacy() {
      const pharmacy = await getPharmacy();
      if (!pharmacy) {
        router.push("/pharm-login");
      } else {
        setPharm(pharmacy);
      }
    }
    fetchPharmacy();
  }, [router]);
  useEffect(() => {
    async function fetchOrders() {
      if (pharm) {
        const fetchedOrders = await getOrdersByPharmacy(pharm.idx);
        setOrders(fetchedOrders);
      }
    }
    fetchOrders();
  }, [pharm]);
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
  const OrderAccordionItem = ({
    initialOrder,
    isInitiallyExpanded,
  }: {
    initialOrder: any;
    isInitiallyExpanded: boolean;
  }) => {
    const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
    const [order, setOrder] = useState<any>(initialOrder);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
    const [isStateRefreshing, setIsStateRefreshing] = useState(false);
    useEffect(() => {
      if (!isExpanded) return;
      async function fetchDetails() {
        try {
          const detailedOrder = await getOrderById(initialOrder.idx);
          setOrder(detailedOrder);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingDetails(false);
        }
      }
      fetchDetails();
    }, [isExpanded, initialOrder.idx]);
    useEffect(() => {
      if (!isExpanded) return;
      async function fetchMessages() {
        const msgs = await getMessagesByOrder(order.idx);
        setMessages(msgs);
      }
      fetchMessages();
    }, [order, isExpanded]);
    useEffect(() => {
      if (!isExpanded) return;
      const intervalId = setInterval(() => {
        refreshOrderStatus();
      }, 10000);
      return () => clearInterval(intervalId);
    }, [order, isExpanded]);
    useEffect(() => {
      if (!isExpanded) return;
      const intervalId = setInterval(() => {
        refreshMessages();
      }, 60000);
      return () => clearInterval(intervalId);
    }, [order, isExpanded]);

    useEffect(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, [messages]);
    const toggleExpanded = () => {
      setIsExpanded((prev) => !prev);
    };
    const refreshMessages = async (manual: boolean = false) => {
      if (!isExpanded) return;
      if (manual) setIsMessagesRefreshing(true);
      try {
        const msgs = await getMessagesByOrder(order.idx);
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      } finally {
        if (manual) setIsMessagesRefreshing(false);
      }
    };
    const refreshOrderStatus = async (manual: boolean = false) => {
      if (!isExpanded) return;
      if (manual) setIsStateRefreshing(true);
      try {
        const updatedStatus = await getOrderStatusById(order.idx);
        setOrder((prevOrder: any) => ({
          ...prevOrder,
          status: updatedStatus?.status,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        if (manual) setIsStateRefreshing(false);
      }
    };
    const sendMessage = async () => {
      if (!newMessage.trim() || isSending) return;
      if (!pharm) return;
      setIsSending(true);
      const messageData = {
        orderId: order.idx,
        content: newMessage,
        pharmacyId: pharm.idx,
      };
      try {
        const newMsg = await createMessage(messageData);
        setMessages((prev) => [...prev, newMsg]);
        setNewMessage("");
      } catch (error) {
        console.error(error);
        alert("메시지 전송에 실패했습니다.");
      } finally {
        setIsSending(false);
      }
    };
    const handleUpdateOrderStatus = async (
      orderIdx: number,
      newStatus: string
    ) => {
      setLoadingStatus(orderIdx);
      try {
        const updatedOrder = await updateOrderStatus(orderIdx, newStatus);

        setOrder(updatedOrder);
      } catch (error) {
        console.error(error);
        alert("주문 상태 업데이트에 실패했습니다.");
      } finally {
        setLoadingStatus(null);
      }
    };
    return (
      <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={toggleExpanded}
        >
          <div className="flex flex-col gap-1">
            <div className="text-sm text-gray-500">
              주문 번호 #{generateOrderNumber(order.idx)}
            </div>
            <div className="text-base font-bold text-gray-800">
              {order?.orderItems?.[0]?.product?.name}
              {order?.orderItems?.length > 1 &&
                ` 외 ${order.orderItems.length - 1}개`}
            </div>
            <div className="text-sm text-gray-600">
              상태: <StatusLabel status={order.status} />
            </div>
          </div>
          <div className="text-sm text-sky-400">
            {isExpanded ? "접기 ▲" : "펼치기 ▼"}
          </div>
        </div>
        {isExpanded && (
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            {loadingDetails ? (
              <div className="flex justify-center items-center mb-10">
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
                <div className="mb-6 flex gap-2">
                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(order.idx, "상담 완료")
                    }
                    className="text-sm flex justify-center items-center w-20 h-8 bg-green-500 text-white rounded"
                  >
                    {loadingStatus === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "상담 완료"
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(order.idx, "조제 완료")
                    }
                    className="text-sm flex justify-center items-center w-20 h-8 bg-blue-500 text-white rounded"
                  >
                    {loadingStatus === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "조제 완료"
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(order.idx, "주문 취소")
                    }
                    className="text-sm flex justify-center items-center w-20 h-8 bg-red-500 text-white rounded"
                  >
                    {loadingStatus === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "주문 취소"
                    )}
                  </button>
                  <button
                    onClick={() => refreshOrderStatus(true)}
                    className="text-sm flex justify-center items-center w-20 h-8 bg-gray-300 text-gray-700 rounded"
                  >
                    {isStateRefreshing ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      "새로고침"
                    )}
                  </button>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-700 mb-4 mt-6">
                    주문 상세 내역
                  </h2>
                  <table className="w-full text-sm text-left text-gray-600 mt-2">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                      <tr>
                        <th className="py-2 px-4">상품명</th>
                        <th className="py-2 px-2">카테고리</th>
                        <th className="py-2 px-4 text-center">개수</th>
                        <th className="py-2 px-4 text-right">가격</th>
                        <th className="py-2 px-4 text-right">총 가격</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderItems?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">{item.product.name}</td>
                          <td className="py-2 px-4">
                            {item.product.categories
                              ?.map((category: any) => category.name)
                              .join(", ") || "카테고리 없음"}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-4 text-right">
                            ₩{item.product.price?.toLocaleString() || 0}
                          </td>
                          <td className="py-2 px-4 text-right">
                            ₩
                            {(
                              (item.product.price || 0) * item.quantity
                            )?.toLocaleString() || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-right">
                    <p className="text-sm">
                      <span className="font-bold">총 결제 금액:</span>{" "}
                      <span className="text-lg font-bold text-sky-500">
                        ₩{order.totalPrice?.toLocaleString() || 0}
                      </span>
                    </p>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>
                      주소: {order.roadAddress} {order.detailAddress}
                    </p>
                    <p className="mt-1">연락처: {order.phone}</p>
                  </div>
                </div>

                {/* 상담 메시지 영역 */}
                <div className="flex justify-between mt-8">
                  <h3 className="text-lg font-bold text-gray-800">
                    상담 메시지
                  </h3>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => refreshMessages(true)}
                      className="text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <ArrowPathIcon
                        className={`w-5 h-5 ${
                          isMessagesRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      새로고침
                    </button>
                  </div>
                </div>
                <div
                  className="mt-3 space-y-3 max-h-60 overflow-y-auto scrollbar-hide py-2"
                  ref={messagesContainerRef}
                >
                  {messages.length > 0 ? (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.pharmacyId ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`w-2/3 p-4 rounded-lg shadow-md ${
                            message.pharmacyId
                              ? "bg-sky-100 text-sky-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              {message.pharmacyId ? pharm?.name : order.phone}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.timestamp).toLocaleString(
                                "ko-KR",
                                {
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 text-sm">
                      메시지가 없습니다.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1 px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none overflow-hidden leading-normal"
                    placeholder="메시지를 입력하세요..."
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isSending}
                    className={`px-2 w-14 bg-sky-400 hover:bg-sky-500 text-white rounded-lg flex items-center justify-center ${
                      isSending ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "전송"
                    )}
                  </button>
                </div>

                {/* 주문자 정보 */}
                <div className="mt-4 p-4 mb-4 bg-gray-100 rounded-lg shadow-md">
                  <h3 className="text-base font-bold text-gray-800 mb-2">
                    주문자 정보
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-700">
                        전화번호:{" "}
                      </span>
                      {order.phone}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-700">
                        요청 사항:{" "}
                      </span>
                      {order.requestNotes || "없음"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-700">
                        주문 날짜:{" "}
                      </span>
                      {new Date(order.createdAt).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };
  if (!pharm) {
    return (
      <div className="flex justify-center w-full max-w-[640px] mt-8 mb-12 px-10 pt-14 pb-14 bg-white sm:shadow-md sm:rounded-lg">
        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="w-full mt-8 mb-10 flex flex-col gap-4">
      {orders.map((order, index) => (
        <OrderAccordionItem
          key={order.idx}
          initialOrder={order}
          isInitiallyExpanded={index === 0}
        />
      ))}
    </div>
  );
}
