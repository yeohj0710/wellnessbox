"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensurePushSubscription,
  getSubAppKeyBase64,
  registerAndActivateSW,
} from "@/lib/push";

type UseRiderPushSubscriptionInput = {
  riderId: number | null;
};

function getNotifyOffKey(riderId: number) {
  return `riderNotifyOff_${riderId}`;
}

export function useRiderPushSubscription({
  riderId,
}: UseRiderPushSubscriptionInput) {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const isSubscribingRef = useRef(false);

  const syncSubscription = useCallback(
    async (subscription: PushSubscription, appKey?: string) => {
      if (!riderId) throw new Error("Missing rider id");

      const response = await fetch("/api/rider-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId,
          subscription,
          role: "rider",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync subscription");
      }

      localStorage.removeItem(getNotifyOffKey(riderId));
      if (appKey) {
        localStorage.setItem("vapidKey", appKey);
      }
      setIsSubscribed(true);
    },
    [riderId]
  );

  const subscribePush = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!riderId) return;
      if (!("serviceWorker" in navigator)) return;
      if (isSubscribingRef.current) return;

      if (Notification.permission === "denied") {
        if (!silent) {
          alert("브라우저 설정에서 알림 권한을 허용해 주세요.");
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
          alert("브라우저 설정에서 알림 권한을 허용해 주세요.");
          setIsSubscribed(false);
          return;
        }
      }

      setIsSubscribeLoading(true);
      isSubscribingRef.current = true;

      try {
        const registration = await registerAndActivateSW();
        const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();

        if (!appKey) {
          if (!silent) {
            alert("알림 키 설정을 확인해 주세요.");
          }
          setIsSubscribed(false);
          return;
        }

        const subscription = await ensurePushSubscription({
          reg: registration,
          appKey,
          onUnsubscribe: async (staleSubscription) => {
            await fetch("/api/push/detach", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: staleSubscription.endpoint,
              }),
            });
          },
        });

        if (!subscription) {
          setIsSubscribed(false);
          return;
        }

        await syncSubscription(subscription, appKey);
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
    [riderId, syncSubscription]
  );

  const resubscribePush = useCallback(
    async (existingSubscription: PushSubscription | null, appKey: string) => {
      try {
        await existingSubscription?.unsubscribe();
      } catch {}
      await subscribePush({ silent: true });
      localStorage.setItem("vapidKey", appKey);
    },
    [subscribePush]
  );

  useEffect(() => {
    if (!riderId) return;

    const notifyOffKey = getNotifyOffKey(riderId);

    const checkSubscription = async () => {
      if (!("serviceWorker" in navigator)) return;
      if (isSubscribingRef.current) return;

      try {
        if (Notification.permission === "denied") {
          setIsSubscribed(false);
          return;
        }

        const registration = await registerAndActivateSW();
        const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();

        if (!appKey) {
          setIsSubscribed(false);
          return;
        }

        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const subAppKey = await getSubAppKeyBase64(registration);
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
                  endpoint: subscription.endpoint,
                }),
              });
            } catch {}
            setIsSubscribed(false);
            return;
          }
        }

        if (!subscription) {
          if (localStorage.getItem(notifyOffKey) === "true") {
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

        if (localStorage.getItem(notifyOffKey) === "true") {
          setIsSubscribed(false);
          return;
        }

        const statusResponse = await fetch("/api/rider-push/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riderId,
            endpoint: subscription.endpoint,
            role: "rider",
          }),
        });

        if (!statusResponse.ok) throw new Error("Failed to check subscription");

        const statusData = await statusResponse.json();

        if (statusData.subscribed) {
          setIsSubscribed(true);
          localStorage.setItem("vapidKey", appKey);
          return;
        }

        if (statusData.action === "resubscribe") {
          await resubscribePush(subscription, appKey);
          return;
        }

        try {
          await syncSubscription(subscription, appKey);
        } catch {
          await resubscribePush(subscription, appKey);
        }
      } catch (error) {
        console.error(error);
        setIsSubscribed(null);
      }
    };

    void checkSubscription();

    const onControllerChange = () => {
      void checkSubscription();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
      }
    };
  }, [riderId, resubscribePush, subscribePush, syncSubscription]);

  const unsubscribePush = useCallback(async () => {
    if (!riderId) return;
    if (!("serviceWorker" in navigator)) return;
    if (isSubscribingRef.current) return;

    setIsSubscribeLoading(true);
    isSubscribingRef.current = true;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/rider-push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riderId,
            endpoint: subscription.endpoint,
            role: "rider",
          }),
        });

        if (!response.ok) throw new Error("Failed to unsubscribe");
        await subscription.unsubscribe();
      }

      localStorage.setItem(getNotifyOffKey(riderId), "true");
      setIsSubscribed(false);
    } catch (error) {
      console.error(error);
      alert("알림 해제에 실패했습니다.");
    } finally {
      isSubscribingRef.current = false;
      setIsSubscribeLoading(false);
    }
  }, [riderId]);

  const toggleSubscription = useCallback(() => {
    if (isSubscribed) {
      void unsubscribePush();
      return;
    }
    void subscribePush();
  }, [isSubscribed, subscribePush, unsubscribePush]);

  return {
    isSubscribed,
    isSubscribeLoading,
    toggleSubscription,
  };
}
