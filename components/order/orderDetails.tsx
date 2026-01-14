"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  getOrderById,
  getOrderStatusById,
  getOrdersWithItemsAndStatusPaginated,
  getOrdersWithItemsByPhonePaginated,
} from "@/lib/order";
import OrderProgressBar from "./orderProgressBar";
import OrderAccordionHeader from "./orderAccordionHeader";
import Image from "next/image";
import {
  ensurePushSubscription,
  getSubAppKeyBase64,
  registerAndActivateSW,
} from "@/lib/push";
import { generateOptimizedPageNumbers } from "@/lib/pagination";

type OrderDetailsProps = {
  phone: string;
  password?: string;
  onBack?: () => void;
  lookupMode?: "phone-password" | "phone-only";
};

export default function OrderDetails({
  phone,
  password = "",
  onBack,
  lookupMode = "phone-password",
}: OrderDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (page: number) => {
      setIsPageLoading(true);
      try {
        const result =
          lookupMode === "phone-only"
            ? await getOrdersWithItemsByPhonePaginated(phone, page)
            : await getOrdersWithItemsAndStatusPaginated(phone, password, page);
        setOrders(result.orders);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
        setError(null);
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "주문 정보를 불러오지 못했습니다.";
        setError(message);
        setOrders([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setIsPageLoading(false);
      }
    },
    [lookupMode, password, phone]
  );

  useEffect(() => {
    setLoading(true);
    fetchOrders(1);
  }, [fetchOrders]);

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    await fetchOrders(page);
  };
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
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
    const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
    const isSubscribingRef = useRef(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef(false);
    const lastSeenIdRef = useRef<number>(0);
    const isNearBottomRef = useRef<boolean>(true);
    const scrollToBottom = () => {
      const el = messagesContainerRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    const handleScroll = () => {
      const el = messagesContainerRef.current;
      if (!el) return;
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      isNearBottomRef.current = gap < 80;
    };

    useEffect(() => {
      const checkSubscription = async () => {
        if (!("serviceWorker" in navigator)) return;
        if (isSubscribingRef.current) return;

        const notifyOff =
          localStorage.getItem(`notifyOff:${order.id}`) === "true";
        if (notifyOff) {
          setIsSubscribed(false);
          return;
        }

        if (Notification.permission === "denied") {
          setIsSubscribed(false);
          return;
        }

        try {
          const reg = await registerAndActivateSW();
          const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
          if (!appKey) {
            setIsSubscribed(false);
            return;
          }
          let sub = await reg.pushManager.getSubscription();
          if (sub && appKey) {
            const subAppKey = await getSubAppKeyBase64(reg);
            const storedKey = localStorage.getItem("vapidKey") || "";
            const mismatch =
              (storedKey && storedKey !== appKey) ||
              (subAppKey && subAppKey !== appKey);
            if (mismatch) {
              try {
                await fetch("/api/push/unsubscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: order.id,
                    endpoint: sub.endpoint,
                    role: "customer",
                  }),
                });
              } catch {}
              try {
                await sub.unsubscribe();
              } catch {}
              sub = null;
            }
          }

          if (sub) {
            try {
              const statusRes = await fetch("/api/push/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: order.id,
                  endpoint: sub.endpoint,
                  role: "customer",
                }),
              });
              if (!statusRes.ok) {
                throw new Error("Failed to check subscription");
              }
              const data = await statusRes.json();
              if (data.subscribed) {
                setIsSubscribed(true);
                localStorage.setItem("vapidKey", appKey);
                return;
              }
              if (data.action === "resubscribe") {
                await resubscribePush(sub, appKey);
                return;
              }
              try {
                await syncSubscription(sub, appKey);
              } catch {
                await resubscribePush(sub, appKey);
              }
              return;
            } catch {
              setIsSubscribed(null);
              return;
            }
          }

          if (Notification.permission === "granted") {
            await subscribePush({ silent: true });
          } else {
            setIsSubscribed(false);
          }
        } catch {
          setIsSubscribed(null);
        }
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
        const sorted = [...msgs].sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(sorted);
        const lastId = sorted.length ? sorted[sorted.length - 1].id : 0;
        lastSeenIdRef.current = lastId;
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
      if (!isExpanded || !isLoaded) return;
      const tick = async () => {
        if (pollingRef.current) return;
        pollingRef.current = true;
        try {
          const msgs = await getMessagesByOrder(order.id);
          const sorted = [...msgs].sort(
            (a: any, b: any) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const newLastId = sorted.length ? sorted[sorted.length - 1].id : 0;
          const hasNew = newLastId > lastSeenIdRef.current;
          setMessages(sorted);
          if (hasNew && isNearBottomRef.current) {
            scrollToBottom();
          }
          if (hasNew) {
            lastSeenIdRef.current = newLastId;
          }
        } finally {
          pollingRef.current = false;
        }
      };
      tick();
      const onFocus = () => tick();
      window.addEventListener("visibilitychange", onFocus, { passive: true });
      window.addEventListener("focus", onFocus, { passive: true });
      const id: ReturnType<typeof setInterval> = setInterval(tick, 10000);
      return () => {
        clearInterval(id);
        window.removeEventListener("visibilitychange", onFocus);
        window.removeEventListener("focus", onFocus);
      };
    }, [isExpanded, isLoaded, order.id]);
    useEffect(() => {
      if (!isExpanded || !isLoaded) return;
      requestAnimationFrame(() => {
        const lastId = messages.length ? messages[messages.length - 1].id : 0;
        lastSeenIdRef.current = Math.max(lastSeenIdRef.current, lastId);
        scrollToBottom();
      });
    }, [isExpanded, isLoaded, messages.length]);
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
        const sorted = [...msgs].sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(sorted);
        lastSeenIdRef.current = sorted.length
          ? sorted[sorted.length - 1].id
          : lastSeenIdRef.current;
        scrollToBottom();
      } catch (error) {
        console.error(error);
      } finally {
        if (manual) setIsMessagesRefreshing(false);
      }
    };
    const syncSubscription = async (
      sub: PushSubscription,
      appKey?: string
    ) => {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          subscription: sub,
          role: "customer",
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to sync subscription");
      }
      localStorage.removeItem(`notifyOff:${order.id}`);
      if (appKey) {
        localStorage.setItem("vapidKey", appKey);
      }
      setIsSubscribed(true);
    };
    const resubscribePush = async (
      existingSub: PushSubscription | null,
      appKey: string
    ) => {
      try {
        await existingSub?.unsubscribe();
      } catch {}
      await subscribePush({ silent: true });
      localStorage.setItem("vapidKey", appKey);
    };
    const subscribePush = async ({ silent = false } = {}) => {
      if (!("serviceWorker" in navigator)) return;
      if (isSubscribingRef.current) return;
      if (Notification.permission === "denied") {
        if (!silent) {
          alert("브라우저 설정에서 알림을 허용할 수 있어요.");
        }
        setIsSubscribed(false);
        return;
      }
      if (Notification.permission === "default") {
        if (silent) {
          setIsSubscribed(false);
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("브라우저 설정에서 알림을 허용할 수 있어요.");
          setIsSubscribed(false);
          return;
        }
      }
      setIsSubscribeLoading(true);
      isSubscribingRef.current = true;
      try {
        const reg = await registerAndActivateSW();
        const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
        if (!appKey) {
          if (!silent) {
            alert("알림 키 설정을 확인해 주세요.");
          }
          setIsSubscribed(false);
          return;
        }
        const sub = await ensurePushSubscription({
          reg,
          appKey,
          lockKey: `push:customer:${order.id}`,
          onUnsubscribe: async (subscription) => {
            await fetch("/api/push/unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                endpoint: subscription.endpoint,
                role: "customer",
              }),
            });
          },
        });
        await syncSubscription(sub, appKey);
      } catch (e) {
        console.error(e);
        if (!silent) {
          alert("알림 설정 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        isSubscribingRef.current = false;
        setIsSubscribeLoading(false);
      }
    };

    const unsubscribePush = async () => {
      if (!("serviceWorker" in navigator)) return;
      if (isSubscribingRef.current) return;
      setIsSubscribeLoading(true);
      isSubscribingRef.current = true;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          const res = await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              endpoint: sub.endpoint,
              role: "customer",
            }),
          });
          if (!res.ok) {
            throw new Error("Failed to unsubscribe");
          }
          await sub.unsubscribe();
        }
        localStorage.setItem(`notifyOff:${order.id}`, "true");
        setIsSubscribed(false);
      } catch (e) {
        console.error(e);
        alert("알림 해제에 실패했습니다.");
      } finally {
        isSubscribingRef.current = false;
        setIsSubscribeLoading(false);
      }
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
        setMessages((prev) => {
          const next = [...prev, newMsg].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return next;
        });
        lastSeenIdRef.current = newMsg.id || lastSeenIdRef.current;
        scrollToBottom();
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
        <div className="w-full max-w-[640px] mx-auto px-0 sm:px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
          <OrderAccordionHeader
            role="customer"
            order={order}
            isExpanded={isExpanded}
            toggle={toggleExpanded}
            onBack={onBack}
            isSubscribed={!!isSubscribed}
            toggleSubscription={() => {
              if (isSubscribed) {
                unsubscribePush();
              } else {
                subscribePush();
              }
            }}
            subscriptionLoading={isSubscribeLoading || isSubscribed === null}
          />
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <div className="flex justify-center items-center mt-2 mb-6">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full max-w-[640px] mx-auto px-0 sm:px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
        <OrderAccordionHeader
          role="customer"
          order={order}
          isExpanded={isExpanded}
          toggle={toggleExpanded}
          onBack={onBack}
          isSubscribed={!!isSubscribed}
          toggleSubscription={() => {
            if (isSubscribed) {
              unsubscribePush();
            } else {
              subscribePush();
            }
          }}
          subscriptionLoading={isSubscribeLoading || isSubscribed === null}
        />
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
                onScroll={handleScroll}
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
                    아직 주고받은 메시지가 없어요.
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
                  className="text-gray-600 flex-1 px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none overflow-hidden leading-normal"
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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (error) {
    return (
      <div className="w-full flex justify-center px-2 sm:px-4">
        <div className="w-full sm:w-[640px] bg-white border border-gray-100 sm:shadow-md rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-gray-900">
            주문을 불러오지 못했어요.
          </p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              뒤로 가기
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col gap-0 sm:gap-4">
      {isPageLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        orders.map((order: any, index: number) => (
          <div key={order.id} className="w-full">
            <OrderAccordionItem
              initialOrder={order}
              isInitiallyExpanded={index === 0}
              onBack={onBack}
            />
            {index < orders.length - 1 && (
              <div className="hidden max-sm:block px-4">
                <div className="border-t border-gray-200" />
              </div>
            )}
          </div>
        ))
      )}

      {totalPages > 1 ? (
        <nav aria-label="페이지네이션" className="mt-6">
          <div className="mx-auto w-full max-w-[640px] px-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => handlePageChange(1)}
                disabled={!canGoPrev}
                aria-label="첫 페이지"
                className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                «
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!canGoPrev}
                aria-label="이전 페이지"
                className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                ←
              </button>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1">
                {generateOptimizedPageNumbers(totalPages, currentPage).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={`h-9 min-w-9 px-3 rounded-full text-sm transition-all border ${
                        page === currentPage
                          ? "bg-sky-600 text-white border-sky-600 shadow"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!canGoNext}
                aria-label="다음 페이지"
                className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                →
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={!canGoNext}
                aria-label="마지막 페이지"
                className="px-3 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                »
              </button>
            </div>

            <div className="mt-2 w-full text-center text-xs text-gray-500">
              페이지 {currentPage} / {totalPages}
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
