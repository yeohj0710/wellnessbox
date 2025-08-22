"use client";

import React, { useState, useEffect } from "react";
import { getBasicOrdersByPharmacy } from "@/lib/order";
import { getPharmacy } from "@/lib/pharmacy";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/common/fullPageLoader";
import OrderAccordionItem from "@/components/pharm/orderAccordionItem";
import { base64ToUint8Array, registerAndActivateSW } from "@/lib/push";

export default function Pharm() {
  const [loading, setLoading] = useState<boolean>(true);
  const [pharm, setPharm] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
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
    async function fetchOrders() {
      const fetchedOrders = await getBasicOrdersByPharmacy(pharm.id);
      setOrders(fetchedOrders);
      setLoading(false);
    }
    fetchOrders();
  }, [pharm]);
  useEffect(() => {
    if (!pharm) return;
    const check = async () => {
      if (!("serviceWorker" in navigator)) return;
      const reg = await registerAndActivateSW();
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (localStorage.getItem("pharmNotifyOff") === "true") {
          setIsSubscribed(false);
          return;
        }
        await subscribePush();
        return;
      }
      try {
        const res = await fetch("/api/pharm-push/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pharmacyId: pharm.id,
            endpoint: sub.endpoint,
          }),
        });
        const data = await res.json();
        setIsSubscribed(!!data.subscribed);
      } catch {
        setIsSubscribed(false);
      }
    };
    check();
  }, [pharm]);

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
      await fetch("/api/pharm-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId: pharm?.id, subscription: sub }),
      });
      localStorage.removeItem("pharmNotifyOff");
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
        await fetch("/api/pharm-push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pharmacyId: pharm?.id,
            endpoint: sub.endpoint,
          }),
        });
        await sub.unsubscribe();
      }
      localStorage.setItem("pharmNotifyOff", "true");
      setIsSubscribed(false);
    } catch (e) {
      console.error(e);
      alert("알림 해제에 실패했습니다.");
    } finally {
      setIsSubscribeLoading(false);
    }
  };
  if (loading) return <FullPageLoader />;
  return (
    <div className="w-full mt-8 mb-12 flex flex-col gap-4">
      <div className="px-4">
        <div className="w-full max-w-[640px] mx-auto rounded-2xl bg-white sm:shadow-md sm:border p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">신규 주문 알림</p>
            <p className="text-xs text-gray-500">
              새 주문이 접수되거나 상담 메시지가 오면 알림을 보내드려요.
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
                aria-label="신규 주문 알림"
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
          <p className="text-gray-500">아직 들어온 주문이 없어요.</p>
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
    </div>
  );
}
