"use client";

import React, { useState, useEffect } from "react";
import { getOrdersByPharmacy } from "@/lib/order";
import { createMessage, getMessagesByOrder } from "@/lib/message";
import { getPharmacy } from "@/lib/pharmacy";
import { useRouter } from "next/navigation";

export default function Pharm() {
  const [pharm, setPharm] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    async function fetchPharmacy() {
      const pharmacy = await getPharmacy();
      if (!pharmacy) {
        router.push("pharm-login");
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
  }, [selectedOrder]);
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageData = {
      orderId: selectedOrder.idx,
      content: newMessage,
      pharmacyId: pharm.idx,
    };
    const newMsg = await createMessage(messageData);
    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
  };
  if (!pharm) {
    return (
      <div className="flex justify-center w-full max-w-[640px] mt-8 mb-12 px-10 pt-14 pb-14 bg-white sm:shadow-md sm:rounded-lg">
        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[640px] mt-8 mb-12 px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg">
      <h1 className="text-xl font-bold mb-4">주문 관리 페이지</h1>
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">주문 목록</h2>
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.idx}
              className={`p-4 border rounded-lg cursor-pointer ${
                selectedOrder?.idx === order.idx
                  ? "bg-sky-100"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <p className="text-sm font-bold text-gray-800">
                주문 번호: {order.idx}
              </p>
              <p className="text-sm text-gray-600">상태: {order.status}</p>
              <p className="text-sm text-gray-600">
                주소: {order.roadAddress} {order.detailAddress}
              </p>
              <p className="text-sm text-gray-600">
                총 결제 금액: ₩{order.totalPrice.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {selectedOrder && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">
            채팅: 주문 번호 {selectedOrder.idx}
          </h2>
          <div className="space-y-4 mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.pharmacyId
                    ? "bg-sky-100 text-sky-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {message.pharmacyId ? "약국" : "소비자"} -{" "}
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              placeholder="메시지를 입력하세요..."
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-sky-400 text-white rounded-lg"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
