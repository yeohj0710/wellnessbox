"use client";

import React, { useState, useEffect } from "react";
import { getBasicOrdersByPharmacy } from "@/lib/order";
import { generateOptimizedPageNumbers } from "@/lib/pagination";
import { getPharmacy } from "@/lib/pharmacy";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/common/fullPageLoader";
import OrderAccordionItem from "@/components/pharm/orderAccordionItem";
import {
  ensurePushSubscription,
  getSubAppKeyBase64,
  registerAndActivateSW,
} from "@/lib/push";

export default function Pharm() {
  const [loading, setLoading] = useState<boolean>(true);
  const [pharm, setPharm] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const isSubscribingRef = React.useRef(false);
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
    if (!pharm) return;
    const load = async () => {
      setIsPageLoading(true);
      const { orders: fetchedOrders, totalPages } =
        await getBasicOrdersByPharmacy(pharm.id, 1);
      setOrders(fetchedOrders);
      setTotalPages(totalPages);
      setLoading(false);
      setIsPageLoading(false);
    };
    load();
  }, [pharm]);

  const handlePageChange = async (page: number) => {
    if (!pharm || page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    setIsPageLoading(true);
    const { orders: fetchedOrders, totalPages: newTotal } =
      await getBasicOrdersByPharmacy(pharm.id, page);
    setOrders(fetchedOrders);
    setTotalPages(newTotal);
    setIsPageLoading(false);
  };

  useEffect(() => {
    if (!pharm) return;
    const key = `pharmNotifyOff_${pharm.id}`;
    const check = async () => {
      if (!("serviceWorker" in navigator)) return;
      if (isSubscribingRef.current) return;
      if (Notification.permission === "denied") {
        setIsSubscribed(false);
        return;
      }
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
            await fetch("/api/pharm-push/unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pharmacyId: pharm.id,
                endpoint: sub.endpoint,
                role: "pharm",
              }),
            });
          } catch {}
          try {
            await sub.unsubscribe();
          } catch {}
          sub = null;
        }
      }
      if (!sub) {
        if (localStorage.getItem(key) === "true") {
          setIsSubscribed(false);
          return;
        }
        if (Notification.permission === "granted") {
          await subscribePush({ silent: true });
        } else {
          setIsSubscribed(false);
        }
        return;
      }
      if (localStorage.getItem(key) === "true") {
        setIsSubscribed(false);
        return;
      }
      try {
        const res = await fetch("/api/pharm-push/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pharmacyId: pharm.id,
            endpoint: sub.endpoint,
            role: "pharm",
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to check subscription");
        }
        const data = await res.json();
        if (data.subscribed) {
          setIsSubscribed(true);
        } else {
          await syncSubscription(sub);
        }
      } catch {
        setIsSubscribed(null);
      }
    };
    check();
    const onChange = () => {
      check();
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => {
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
  }, [pharm]);

  const syncSubscription = async (sub: PushSubscription) => {
    const res = await fetch("/api/pharm-push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pharmacyId: pharm?.id,
        subscription: sub,
        role: "pharm",
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to sync subscription");
    }
    if (pharm?.id) {
      localStorage.removeItem(`pharmNotifyOff_${pharm.id}`);
    }
    setIsSubscribed(true);
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
        lockKey: `push:pharm:${pharm?.id ?? "self"}`,
        onUnsubscribe: async (subscription) => {
          await fetch("/api/pharm-push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pharmacyId: pharm?.id,
              endpoint: subscription.endpoint,
              role: "pharm",
            }),
          });
        },
      });
      await syncSubscription(sub);
      localStorage.setItem("vapidKey", appKey);
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
        const res = await fetch("/api/pharm-push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pharmacyId: pharm?.id,
            endpoint: sub.endpoint,
            role: "pharm",
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to unsubscribe");
        }
        await sub.unsubscribe();
      }
      if (pharm?.id) {
        localStorage.setItem(`pharmNotifyOff_${pharm.id}`, "true");
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error(e);
      alert("알림 해제에 실패했습니다.");
    } finally {
      isSubscribingRef.current = false;
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
              신규 주문 알림
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              새 주문이 접수되거나 상담 메시지가 오면 알림을 보내드려요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label
              className={`relative inline-flex items-center ${
                isSubscribeLoading || isSubscribed === null
                  ? "opacity-50 pointer-events-none"
                  : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={!!isSubscribed}
                onChange={() =>
                  isSubscribed ? unsubscribePush() : subscribePush()
                }
                disabled={isSubscribeLoading || isSubscribed === null}
                className="sr-only peer"
                aria-label="신규 주문 알림"
                aria-checked={!!isSubscribed}
                role="switch"
              />
              <span className="w-12 h-7 rounded-full bg-gray-200 peer-checked:bg-sky-500 transition-colors duration-200 relative after:absolute after:top-0.5 after:left-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5"></span>
            </label>
            {isSubscribeLoading || isSubscribed === null ? (
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
          <p className="text-gray-500">아직 들어온 주문이 없어요.</p>
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
                pharm={pharm}
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
