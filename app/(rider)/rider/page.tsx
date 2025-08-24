"use client";

import React, { useState, useEffect } from "react";
import { getBasicOrdersByRider } from "@/lib/order";
import { generateOptimizedPageNumbers } from "@/lib/pagination";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/common/fullPageLoader";
import { getRider } from "@/lib/rider";
import OrderAccordionItem from "@/components/rider/orderAccordionItem";
import { base64ToUint8Array, registerAndActivateSW } from "@/lib/push";

export default function Rider() {
  const [loading, setLoading] = useState<boolean>(true);
  const [rider, setRider] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
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
    const load = async () => {
      setIsPageLoading(true);
      const { orders: fetchedOrders, totalPages } = await getBasicOrdersByRider(
        1
      );
      setOrders(fetchedOrders);
      setTotalPages(totalPages);
      setLoading(false);
      setIsPageLoading(false);
    };
    load();
  }, [rider]);

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    setIsPageLoading(true);
    const { orders: fetchedOrders, totalPages: newTotal } =
      await getBasicOrdersByRider(page);
    setOrders(fetchedOrders);
    setTotalPages(newTotal);
    setIsPageLoading(false);
  };

  useEffect(() => {
    if (!rider) return;
    const check = async () => {
      if (!("serviceWorker" in navigator)) return;
      const reg = await registerAndActivateSW();
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (localStorage.getItem("riderNotifyOff") === "true") {
          setIsSubscribed(false);
          return;
        }
        await subscribePush();
        return;
      }
      try {
        const res = await fetch("/api/rider-push/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        const data = await res.json();
        if (data.subscribed) {
          setIsSubscribed(true);
        } else {
          await subscribePush();
        }
      } catch {
        setIsSubscribed(false);
      }
    };
    check();
  }, [rider]);

  const subscribePush = async () => {
    if (!("serviceWorker" in navigator)) return;
    setIsSubscribeLoading(true);
    try {
      const reg = await registerAndActivateSW();
      let sub = await reg.pushManager.getSubscription();
      const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!appKey) return;
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(appKey),
        });
      }
      await fetch("/api/rider-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      localStorage.removeItem("riderNotifyOff");
      setIsSubscribed(true);
    } catch (e) {
      console.error(e);
      alert("알림 설정에 실패했습니다.");
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const unsubscribePush = async () => {
    if (!("serviceWorker" in navigator)) return;
    setIsSubscribeLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/rider-push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      localStorage.setItem("riderNotifyOff", "true");
      setIsSubscribed(false);
    } catch (e) {
      console.error(e);
      alert("알림 해제에 실패했습니다.");
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (loading) return <FullPageLoader />;

  return (
    <div className="w-full mt-8 mb-12 flex flex-col gap-4">
      <div className="px-4">
        <div className="w-full max-w-[640px] mx-auto rounded-2xl bg-white sm:shadow-md sm:border p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              픽업 대기 주문 알림
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              조제가 완료되어 픽업이 필요한 주문이 생기면 알려드려요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label
              className={`relative inline-flex items-center ${
                isSubscribeLoading
                  ? "opacity-50 pointer-events-none"
                  : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={() =>
                  isSubscribed ? unsubscribePush() : subscribePush()
                }
                disabled={isSubscribeLoading}
                className="sr-only peer"
                aria-label="픽업 대기 주문 알림"
                aria-checked={isSubscribed}
                role="switch"
              />
              <span className="w-12 h-7 rounded-full bg-gray-200 peer-checked:bg-sky-500 transition-colors duration-200 relative after:absolute after:top-0.5 after:left-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5"></span>
            </label>
            {isSubscribeLoading ? (
              <span
                className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              ></span>
            ) : (
              <span
                className={`text-xs ${
                  isSubscribed ? "text-sky-600" : "text-gray-500"
                }`}
              >
                {isSubscribed ? "켜짐" : "꺼짐"}
              </span>
            )}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex justify-center items-center w-full max-w-[640px] mx-auto mt-8 mb-12 py-12 bg-white sm:shadow-md sm:rounded-lg">
          <p className="text-gray-500">아직 픽업 대기 중인 주문이 없어요.</p>
        </div>
      ) : (
        <>
          {isPageLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            orders.map((order: any, index: number) => (
              <OrderAccordionItem
                key={order.id}
                initialOrder={order}
                isInitiallyExpanded={index === 0}
              />
            ))
          )}
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
        </>
      )}
    </div>
  );
}
