"use client";

import React, { useState, useEffect } from "react";
import { getOrdersByPharmacy, updateOrderStatus } from "@/lib/order";
import { createMessage, getMessagesByOrder } from "@/lib/message";
import { getPharmacy } from "@/lib/pharmacy";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function Pharm() {
  const [pharm, setPharm] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    async function fetchMessages() {
      if (selectedOrder) {
        const msgs = await getMessagesByOrder(selectedOrder.idx);
        setMessages(msgs);
      }
    }
    fetchMessages();
    const intervalId = setInterval(fetchMessages, 60000);
    return () => clearInterval(intervalId);
  }, [selectedOrder]);
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);
  const refreshMessages = async () => {
    setIsRefreshing(true);
    if (selectedOrder) {
      const msgs = await getMessagesByOrder(selectedOrder.idx);
      setMessages(msgs);
    }
    setIsRefreshing(false);
  };
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder) return;
    setIsSending(true);
    const messageData = {
      orderId: selectedOrder.idx,
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
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.idx === updatedOrder.idx ? updatedOrder : order
        )
      );
      if (selectedOrder && selectedOrder.idx === updatedOrder.idx) {
        setSelectedOrder(updatedOrder);
      }
    } catch (error) {
      console.error(error);
      alert("주문 상태 업데이트에 실패했습니다.");
    } finally {
      setLoadingStatus(null);
    }
  };
  const toggleOrderSelection = (order: any) => {
    if (selectedOrder?.idx === order.idx) {
      setSelectedOrder(null);
    } else {
      setSelectedOrder(order);
    }
  };
  if (!pharm) {
    return (
      <div className="flex justify-center w-full max-w-[640px] mt-8 mb-12 px-10 pt-14 pb-14 bg-white sm:shadow-md sm:rounded-lg">
        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[640px] mt-8 mb-12 px-6 sm:px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg">
      <h1 className="text-xl font-bold mb-4">주문 관리 페이지</h1>
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">주문 목록</h2>
        <ul className="space-y-4">
          {orders.map((order) => (
            <React.Fragment key={order.idx}>
              <li
                className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-100 ${
                  selectedOrder?.idx === order.idx ? "bg-sky-100" : ""
                }`}
                onClick={() => toggleOrderSelection(order)}
              >
                <p className="text-sm font-bold text-gray-800">
                  주문 번호: {order.idx}
                </p>
                <p className="text-sm text-gray-600">
                  상태:{" "}
                  <span
                    className={`font-bold transition-transform duration-500 ${
                      order.status === "상담 완료"
                        ? "text-green-500 status-update"
                        : order.status === "조제 완료"
                        ? "text-sky-400 status-update"
                        : order.status === "주문 취소"
                        ? "text-red-500 status-update"
                        : "text-gray-600 status-update"
                    }`}
                  >
                    {order.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  주소: {order.roadAddress} {order.detailAddress}
                </p>
                <p className="text-sm text-gray-600">
                  총 결제 금액:{" "}
                  <span className="text-sky-400 font-bold">
                    ₩{order.totalPrice.toLocaleString()}
                  </span>
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateOrderStatus(order.idx, "상담 완료");
                    }}
                    className="text-sm flex justify-center items-center w-20 h-8 bg-green-500 text-white rounded"
                  >
                    {loadingStatus === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "상담 완료"
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateOrderStatus(order.idx, "조제 완료");
                    }}
                    className="text-sm flex justify-center items-center w-20 h-8 bg-blue-500 text-white rounded"
                  >
                    {loadingStatus === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "조제 완료"
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateOrderStatus(order.idx, "주문 취소");
                    }}
                    className="text-sm flex justify-center items-center w-20 h-8 bg-red-500 text-white rounded"
                  >
                    {loadingStatus === order.idx ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "주문 취소"
                    )}
                  </button>
                </div>
              </li>
              {selectedOrder?.idx === order.idx && (
                <div className="px-4">
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      주문 상세 정보
                    </h3>
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
                        {order.orderItems?.map((item: any) => (
                          <tr
                            key={item.idx}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-2 px-4">{item.product.name}</td>
                            <td className="py-2 px-4">
                              {item.product.categories
                                .map((category: any) => category.name)
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
                                item.product.price * item.quantity
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
                                {message.pharmacyId ? "약국" : "고객님"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(message.timestamp).toLocaleTimeString(
                                  [],
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
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={refreshMessages}
                      className="text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <ArrowPathIcon
                        className={`w-5 h-5 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      새로고침
                    </button>
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
                </div>
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}
