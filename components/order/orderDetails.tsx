"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  getOrderById,
  getOrderStatusById,
  getOrdersWithItemsAndStatus,
} from "@/lib/order";
import OrderProgressBar from "./orderProgressBar";
import OrderAccordionHeader from "./orderAccordionHeader";
import FullPageLoader from "@/components/common/fullPageLoader";
import Image from "next/image";

function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64Safe);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

function uint8ArrayToUrlBase64(u8: Uint8Array) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getSubAppKeyBase64(reg: ServiceWorkerRegistration) {
  const sub = await reg.pushManager.getSubscription();
  const ab = (sub as any)?.options?.applicationServerKey as
    | ArrayBuffer
    | undefined;
  if (!ab) return null;
  return uint8ArrayToUrlBase64(new Uint8Array(ab));
}

const registerAndActivateSW = async () => {
  const reg =
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.register("/sw.js"));
  await reg.update();
  if (reg.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    await new Promise<void>((resolve) => {
      const onChange = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
    });
  }
  return reg;
};

export default function OrderDetails({ phone, password, onBack }: any) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any>([]);
  useEffect(() => {
    const fetchBasicOrderInfo = async () => {
      const basickOrderInfo = await getOrdersWithItemsAndStatus(
        phone,
        password
      );
      setOrders(basickOrderInfo);
      setLoading(false);
    };
    fetchBasicOrderInfo();
  }, [phone, password]);
  const OrderAccordionItem = ({
    initialOrder,
    isInitiallyExpanded,
    onBack,
  }: any) => {
    const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
    const [order, setOrder] = useState(initialOrder);
    const [isLoaded, setIsLoaded] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
    const [isStateRefreshing, setIsStateRefreshing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const checkSubscription = async () => {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) return;
        try {
          const res = await fetch('/api/push/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, endpoint: sub.endpoint }),
          });
          const data = await res.json();
          setIsSubscribed(!!data.subscribed);
        } catch {}
      };
      checkSubscription();
    }, [order.id]);
    useEffect(() => {
      if (!isExpanded || isLoaded) return;
      async function fetchDetailsAndMessages() {
        const [detailedOrder, msgs] = await Promise.all([
          getOrderById(initialOrder.id),
          getMessagesByOrder(initialOrder.id),
        ]);
        setOrder((prevOrder: any) => ({ ...prevOrder, ...detailedOrder }));
        setMessages(msgs);
        setIsLoaded(true);
      }
      fetchDetailsAndMessages();
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded || !isLoaded) return;
      const intervalId = setInterval(() => {
        refreshOrderStatus();
      }, 10000);
      return () => clearInterval(intervalId);
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded) return;
      const intervalId = setInterval(() => {
        refreshMessages();
      }, 60000);
      return () => clearInterval(intervalId);
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded || !isLoaded) return;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, [isExpanded, isLoaded, messages]);
    const toggleExpanded = () => {
      setIsExpanded((prev: any) => !prev);
    };
    const refreshOrderStatus = async (manual: boolean = false) => {
      try {
        const updatedStatus = await getOrderStatusById(order.id);
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
    const refreshMessages = async (manual: boolean = false) => {
      if (manual) setIsMessagesRefreshing(true);
      try {
        const msgs = await getMessagesByOrder(order.id);
        setMessages(msgs);
      } catch (error) {
        console.error(error);
      } finally {
        if (manual) setIsMessagesRefreshing(false);
      }
    };
    const subscribePush = async () => {
      if (!("serviceWorker" in navigator)) return;
      const reg = await registerAndActivateSW();
      let existing = await reg.pushManager.getSubscription();
      const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!appKey) return;
      const storedKey = localStorage.getItem("vapidKey") || "";
      const subAppKey = existing ? await getSubAppKeyBase64(reg) : null;
      const mismatch =
        !!existing &&
        (storedKey !== appKey || (subAppKey && subAppKey !== appKey));
      if (mismatch && existing) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        existing = null;
      }
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(appKey),
        }));
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, subscription: sub }),
      });
      localStorage.setItem("vapidKey", appKey);
      setIsSubscribed(true);
    };

    const unsubscribePush = async () => {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, endpoint: sub.endpoint }),
        });
      }
      setIsSubscribed(false);
    };
    const sendMessage = async () => {
      if (!newMessage.trim() || isSending) return;
      setIsSending(true);
      const messageData = {
        orderId: order.id,
        content: newMessage,
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
    const handleDeleteMessage = async (messageId: number) => {
      const confirmDelete = window.confirm("정말로 메시지를 삭제할까요?");
      if (!confirmDelete) return;
      try {
        await deleteMessage(messageId);
        setMessages((prevMessages) =>
          prevMessages.filter((message) => message.id !== messageId)
        );
      } catch (error) {
        console.error(error);
        alert("메시지 삭제에 실패했습니다.");
      }
    };
    if (isExpanded && !isLoaded) {
      return (
        <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
          <OrderAccordionHeader
            order={order}
            isExpanded={isExpanded}
            toggle={toggleExpanded}
            onBack={onBack}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isSubscribed) {
                  unsubscribePush();
                } else {
                  subscribePush();
                }
              }}
              className="text-xs text-sky-500 underline"
            >
              {isSubscribed ? "알림 끄기" : "알림 켜기"}
            </button>
          </div>
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <div className="flex justify-center items-center mt-2 mb-6">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
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
          onBack={onBack}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isSubscribed) {
                unsubscribePush();
              } else {
                subscribePush();
              }
            }}
            className="text-xs text-sky-500 underline"
          >
            {isSubscribed ? "알림 끄기" : "알림 켜기"}
          </button>
        </div>
        {isExpanded && (
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <OrderProgressBar currentStatus={order.status} />
            <div>
              <h2 className="text-lg font-bold text-gray-700 mb-4 mt-12">
                주문 상세 내역
              </h2>
              {order.orderItems.map((orderItem: any, orderId: number) => {
                const { pharmacyProduct } = orderItem;
                const { product } = pharmacyProduct;
                const productImage = product.images?.[0] || "/placeholder.png";
                const productName = product.name;
                const optionType = pharmacyProduct.optionType;
                const productCategories = product.categories?.length
                  ? product.categories
                      .map((category: any) => category.name)
                      .join(", ")
                  : "옵션 없음";
                const productPrice = pharmacyProduct.price.toLocaleString();
                const totalPrice = (
                  pharmacyProduct.price * orderItem.quantity
                ).toLocaleString();
                return (
                  <div
                    key={orderId}
                    className="flex items-center justify-between mb-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16">
                        <Image
                          src={productImage}
                          alt={productName}
                          fill
                          sizes="128px"
                          className="object-cover rounded-lg"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">
                          {productName} ({optionType})
                        </h3>
                        <p className="text-xs text-gray-500">
                          {productCategories}
                        </p>
                        <p className="text-sm font-bold text-sky-400 mt-1">
                          {productPrice}원 × {orderItem.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-sky-400">
                      {totalPrice}원
                    </p>
                  </div>
                );
              })}
              <div className="flex justify-end text-sm text-gray-600">
                <span>배송비</span>
                <span className="font-bold ml-2">3,000원</span>
              </div>
              <div className="flex justify-end gap-2 text-base font-bold mt-2">
                <span className="text-gray-700">총 결제 금액</span>
                <span className="text-sky-400">
                  {order.totalPrice.toLocaleString()}원
                </span>
              </div>
            </div>
            <div className="mt-8">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-700">상담 메시지</h2>
                <button
                  onClick={() => refreshMessages(true)}
                  className="text-sm flex items-center gap-1 text-sky-400 hover:underline"
                >
                  새로고침
                  <ArrowPathIcon
                    className={`w-5 h-5 ${
                      isMessagesRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
              <div
                className="mt-3 space-y-3 max-h-96 overflow-y-auto scrollbar-hide py-2"
                ref={messagesContainerRef}
              >
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.pharmacyId ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`relative w-2/3 p-4 rounded-lg shadow-md ${
                          !message.pharmacyId
                            ? "bg-sky-100 text-sky-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {!message.pharmacyId && (
                          <button
                            className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 text-xs cursor:pointer"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            ✕
                          </button>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            {message.pharmacyId
                              ? order.pharmacy?.name
                              : order.phone}
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
                  <p className="text-center text-gray-500 text-sm my-10">
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
                  className="flex-1 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none overflow-hidden leading-normal"
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
            <h3 className="mb-2 font-bold mt-8 border-t pt-6">약국 정보</h3>
            <div className="flex flex-col text-sm gap-1 mt-4">
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
          </div>
        )}
      </div>
    );
  };
  if (loading) return <FullPageLoader />;
  return (
    <div className="w-full flex flex-col gap-4">
      {orders.map((order: any, index: number) => (
        <OrderAccordionItem
          key={order.id}
          initialOrder={order}
          isInitiallyExpanded={index === 0}
          onBack={onBack}
        />
      ))}
    </div>
  );
}
