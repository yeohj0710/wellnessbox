"use client";

import { useCallback, useRef, useState } from "react";
import { ORDER_STATUS } from "@/lib/order/orderStatus";
import { ensureCustomerPushSubscription } from "@/lib/push/customerSubscription";
import { ORDER_COMPLETE_ALERT_COPY } from "./orderComplete.copy";
import type { OrderRecord, SubscriptionInfo } from "./orderComplete.types";

type UseOrderCompleteNotificationsOptions = {
  order: OrderRecord | null;
  closeNotifyModal: () => void;
};

type UseOrderCompleteNotificationsResult = {
  notifyLoading: boolean;
  subscriptionInfo: SubscriptionInfo | null;
  handleNotifyAllowed: () => void;
  handleAllowNotification: () => Promise<boolean>;
  handleUnsubscribe: () => Promise<void>;
};

export function useOrderCompleteNotifications(
  options: UseOrderCompleteNotificationsOptions
): UseOrderCompleteNotificationsResult {
  const { order, closeNotifyModal } = options;
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const endpointRef = useRef<string | null>(null);

  const handleNotifyAllowed = useCallback(() => {
    if (endpointRef.current) {
      setSubscriptionInfo({ endpoint: endpointRef.current });
    }
  }, []);

  const subscribePush = useCallback(async () => {
    try {
      if (!order) return "";
      const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!appKey) return "";
      const subscription = await ensureCustomerPushSubscription({ silent: true });
      if (!subscription) return "";

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          subscription,
          role: "customer",
        }),
      });

      localStorage.setItem("vapidKey", appKey);
      return subscription.endpoint as string;
    } catch {
      return "";
    }
  }, [order]);

  const handleAllowNotification = useCallback(async () => {
    setNotifyLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const endpoint = await subscribePush();
        endpointRef.current = endpoint || null;
        try {
          if (order) {
            const image =
              order.orderItems?.[0]?.pharmacyProduct?.product?.images?.[0];
            await fetch("/api/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                status: ORDER_STATUS.PAYMENT_COMPLETE,
                image,
              }),
            });
          }
        } catch {}
        closeNotifyModal();
        return true;
      }

      alert(ORDER_COMPLETE_ALERT_COPY.notificationPermissionDenied);
      closeNotifyModal();
      return true;
    } finally {
      setNotifyLoading(false);
    }
  }, [closeNotifyModal, order, subscribePush]);

  const handleUnsubscribe = useCallback(async () => {
    if (!subscriptionInfo || !order) return;
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            endpoint: subscription.endpoint,
            role: "customer",
          }),
        });
      }
    }
    localStorage.setItem(`notifyOff:${order.id}`, "true");
    setSubscriptionInfo(null);
  }, [order, subscriptionInfo]);

  return {
    notifyLoading,
    subscriptionInfo,
    handleNotifyAllowed,
    handleAllowNotification,
    handleUnsubscribe,
  };
}
