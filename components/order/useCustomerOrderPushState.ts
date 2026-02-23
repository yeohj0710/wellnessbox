"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSubAppKeyBase64 } from "@/lib/push";
import { ensureCustomerPushSubscription } from "@/lib/push/customerSubscription";

type UseCustomerOrderPushStateInput = {
  orderId: number;
};

export function useCustomerOrderPushState({
  orderId,
}: UseCustomerOrderPushStateInput) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionStatusLoading, setIsSubscriptionStatusLoading] =
    useState(true);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const isSubscribingRef = useRef(false);
  const isCheckingSubscriptionRef = useRef(false);

  const checkSubscriptionStatus = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setIsSubscribed(false);
      setIsSubscriptionStatusLoading(false);
      return;
    }
    if (isSubscribingRef.current || isCheckingSubscriptionRef.current) {
      return;
    }

    isCheckingSubscriptionRef.current = true;
    setIsSubscriptionStatusLoading(true);

    try {
      const notifyOff = localStorage.getItem(`notifyOff:${orderId}`) === "true";
      if (notifyOff) {
        setIsSubscribed(false);
        return;
      }

      if (Notification.permission !== "granted") {
        setIsSubscribed(false);
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setIsSubscribed(false);
        return;
      }
      const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!appKey) {
        setIsSubscribed(false);
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const subAppKey = await getSubAppKeyBase64(reg);
        const storedKey = localStorage.getItem("vapidKey") || "";
        const mismatch =
          (storedKey && storedKey !== appKey) ||
          (subAppKey && subAppKey !== appKey);
        if (mismatch) {
          try {
            await fetch("/api/push/detach", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
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

      if (!sub) {
        setIsSubscribed(false);
        return;
      }

      const statusRes = await fetch("/api/push/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          endpoint: sub.endpoint,
          role: "customer",
        }),
      });
      if (!statusRes.ok) {
        setIsSubscribed(false);
        return;
      }

      const data = await statusRes.json();
      const subscribed = data?.subscribed === true;
      setIsSubscribed(subscribed);
      if (subscribed) {
        localStorage.setItem("vapidKey", appKey);
      }
    } catch {
      setIsSubscribed(false);
    } finally {
      isCheckingSubscriptionRef.current = false;
      setIsSubscriptionStatusLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const syncSubscription = useCallback(
    async (sub: PushSubscription, appKey?: string) => {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          subscription: sub,
          role: "customer",
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to sync subscription");
      }
      localStorage.removeItem(`notifyOff:${orderId}`);
      if (appKey) {
        localStorage.setItem("vapidKey", appKey);
      }
      setIsSubscribed(true);
    },
    [orderId]
  );

  const subscribePush = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (isSubscribingRef.current) return;
      if (Notification.permission === "denied") {
        if (!silent) {
          alert("브라우저 설정에서 알림을 허용해 주세요.");
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
          alert("브라우저 설정에서 알림을 허용해 주세요.");
          setIsSubscribed(false);
          return;
        }
      }
      setIsSubscribeLoading(true);
      isSubscribingRef.current = true;
      try {
        const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
        if (!appKey) {
          if (!silent) {
            alert("알림 키 설정을 확인해 주세요.");
          }
          setIsSubscribed(false);
          return;
        }
        const sub = await ensureCustomerPushSubscription({ silent });

        if (!sub) {
          setIsSubscribed(false);
          return;
        }

        await syncSubscription(sub, appKey);
      } catch (error) {
        console.error(error);
        if (!silent) {
          alert("알림 설정 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        isSubscribingRef.current = false;
        setIsSubscribeLoading(false);
      }
    },
    [syncSubscription]
  );

  const unsubscribePush = useCallback(async () => {
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
            orderId,
            endpoint: sub.endpoint,
            role: "customer",
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to unsubscribe");
        }
      }
      localStorage.setItem(`notifyOff:${orderId}`, "true");
      setIsSubscribed(false);
    } catch (error) {
      console.error(error);
      alert("알림 해제에 실패했습니다.");
    } finally {
      isSubscribingRef.current = false;
      setIsSubscribeLoading(false);
    }
  }, [orderId]);

  const toggleSubscription = useCallback(() => {
    if (isSubscribed) {
      void unsubscribePush();
      return;
    }
    void subscribePush();
  }, [isSubscribed, subscribePush, unsubscribePush]);

  return {
    isSubscribed,
    isSubscriptionStatusLoading,
    isSubscribeLoading,
    toggleSubscription,
  };
}
