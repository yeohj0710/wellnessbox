"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensurePushSubscription,
  getSubAppKeyBase64,
  registerAndActivateSW,
} from "@/lib/push";

type UsePharmPushSubscriptionInput = {
  pharmacyId: number | null;
};

function getNotifyOffKey(pharmacyId: number) {
  return `pharmNotifyOff_${pharmacyId}`;
}

export function usePharmPushSubscription({
  pharmacyId,
}: UsePharmPushSubscriptionInput) {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const isSubscribingRef = useRef(false);

  const syncSubscription = useCallback(
    async (subscription: PushSubscription, appKey?: string) => {
      if (!pharmacyId) throw new Error("Missing pharmacy id");

      const response = await fetch("/api/pharm-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyId,
          subscription,
          role: "pharm",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync subscription");
      }

      localStorage.removeItem(getNotifyOffKey(pharmacyId));
      if (appKey) {
        localStorage.setItem("vapidKey", appKey);
      }
      setIsSubscribed(true);
    },
    [pharmacyId]
  );

  const subscribePush = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!pharmacyId) return;
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
    [pharmacyId, syncSubscription]
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
    if (!pharmacyId) return;

    const notifyOffKey = getNotifyOffKey(pharmacyId);

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

        let subscription = await registration.pushManager.getSubscription();

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

        const statusResponse = await fetch("/api/pharm-push/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pharmacyId,
            endpoint: subscription.endpoint,
            role: "pharm",
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
  }, [pharmacyId, resubscribePush, subscribePush, syncSubscription]);

  const unsubscribePush = useCallback(async () => {
    if (!pharmacyId) return;
    if (!("serviceWorker" in navigator)) return;
    if (isSubscribingRef.current) return;

    setIsSubscribeLoading(true);
    isSubscribingRef.current = true;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/pharm-push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pharmacyId,
            endpoint: subscription.endpoint,
            role: "pharm",
          }),
        });

        if (!response.ok) throw new Error("Failed to unsubscribe");
        await subscription.unsubscribe();
      }

      localStorage.setItem(getNotifyOffKey(pharmacyId), "true");
      setIsSubscribed(false);
    } catch (error) {
      console.error(error);
      alert("알림 해제에 실패했습니다.");
    } finally {
      isSubscribingRef.current = false;
      setIsSubscribeLoading(false);
    }
  }, [pharmacyId]);

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
