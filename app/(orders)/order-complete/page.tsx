"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import FullPageLoader from "@/components/common/fullPageLoader";
import DeliveryExperienceCoachCard from "@/components/order/DeliveryExperienceCoachCard";
import OfflineTouchpointCoachCard from "@/components/order/OfflineTouchpointCoachCard";
import OrderCancelledView from "@/components/order/orderCancelledView";
import OrderNotifyModal from "@/components/order/orderNotifyModal";
import OrderSummary from "@/components/order/orderSummary";
import OrderCompleteAdherenceLoopCard from "./OrderCompleteAdherenceLoopCard";
import OrderCompletionConfidenceCard from "./OrderCompletionConfidenceCard";
import OrderCompleteNotificationPlanCard from "./OrderCompleteNotificationPlanCard";
import { ORDER_COMPLETE_PAGE_COPY } from "./orderComplete.copy";
import { useOrderCompleteBootstrap } from "./useOrderCompleteBootstrap";
import { useOrderCompleteNotifications } from "./useOrderCompleteNotifications";
import { resolveOrderCompleteNotificationPlan } from "@/lib/message-orchestration/engine";

const NOTIFY_PROMPT_STORAGE_KEY = "customerNotifyPromptedAt";
const NOTIFY_PROMPT_COOLDOWN_DAYS = 14;

export default function OrderComplete() {
  const router = useRouter();
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [browserSupported, setBrowserSupported] = useState(false);
  const [notifyOptedOut, setNotifyOptedOut] = useState(false);
  const [recentlyPrompted, setRecentlyPrompted] = useState(false);
  const promptedOrderIdRef = useRef<number | null>(null);
  const pushHome = useCallback(() => {
    router.push("/");
  }, [router]);
  const openNotifyModal = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(NOTIFY_PROMPT_STORAGE_KEY, String(Date.now()));
    }
    setShowNotifyModal(true);
  }, []);
  const closeNotifyModal = useCallback(() => {
    setShowNotifyModal(false);
  }, []);
  const { order, loading, cancelled, returnToCart } = useOrderCompleteBootstrap({
    pushHome,
  });
  const {
    notifyLoading,
    subscriptionInfo,
    handleNotifyAllowed,
    handleAllowNotification,
    handleUnsubscribe,
  } = useOrderCompleteNotifications({
    order,
    closeNotifyModal,
  });

  useEffect(() => {
    if (!order) return;
    if (typeof window === "undefined") return;

    const supported = "serviceWorker" in navigator && "Notification" in window;
    setBrowserSupported(supported);
    setNotificationPermission(supported ? Notification.permission : "unsupported");
    setNotifyOptedOut(localStorage.getItem(`notifyOff:${order.id}`) === "true");

    const rawPromptedAt = Number(localStorage.getItem(NOTIFY_PROMPT_STORAGE_KEY) || 0);
    const cooldownMs =
      NOTIFY_PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    setRecentlyPrompted(
      Number.isFinite(rawPromptedAt) && rawPromptedAt > 0
        ? Date.now() - rawPromptedAt < cooldownMs
        : false
    );
  }, [order, showNotifyModal, subscriptionInfo]);

  const notificationPlan = useMemo(
    () =>
      order
        ? resolveOrderCompleteNotificationPlan({
            itemCount: order.orderItems?.length ?? 0,
            hasRequestNotes: Boolean(order.requestNotes?.trim()),
            hasEntranceDetails: Boolean(
              order.entrancePassword?.trim() || order.directions?.trim()
            ),
            browserSupported,
            notificationPermission,
            optedOut: notifyOptedOut,
            recentlyPrompted,
          })
        : null,
    [
      browserSupported,
      notificationPermission,
      notifyOptedOut,
      order,
      recentlyPrompted,
    ]
  );

  useEffect(() => {
    if (!order || !notificationPlan) return;
    if (notificationPlan.mode !== "modal") return;
    if (promptedOrderIdRef.current === order.id) return;
    promptedOrderIdRef.current = order.id;
    localStorage.setItem(NOTIFY_PROMPT_STORAGE_KEY, String(Date.now()));
    setShowNotifyModal(true);
  }, [notificationPlan, order]);

  if (loading || (!cancelled && !order)) return <FullPageLoader />;
  if (cancelled) return <OrderCancelledView onReturn={returnToCart} />;
  if (!order || !notificationPlan) return <FullPageLoader />;

  return (
    <>
      {showNotifyModal && order && (
        <OrderNotifyModal
          orderId={order.id}
          onAllow={handleAllowNotification}
          onAllowed={handleNotifyAllowed}
          onClose={closeNotifyModal}
          loading={notifyLoading}
        />
      )}
      <main className="w-full max-w-[640px] mx-2 sm:mx-auto">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
          {ORDER_COMPLETE_PAGE_COPY.title}
        </h1>
        <OrderSummary order={order} />
        <BetaFeatureGate
          title="Beta 주문 후 가이드"
          helper="새로 추가된 안심·배송·복용 가이드는 필요할 때만 펼쳐보세요."
          className="mx-2 mt-4 sm:mx-0"
        >
          <div className="space-y-4">
            <OrderCompletionConfidenceCard order={order} />
            <DeliveryExperienceCoachCard
              order={order}
              surface="order-complete"
              className="sm:mx-0"
            />
            <OfflineTouchpointCoachCard
              order={order}
              surface="order-complete"
              className="sm:mx-0"
            />
            <OrderCompleteAdherenceLoopCard order={order} />
            {subscriptionInfo ? null : notificationPlan.mode === "inline" ? (
              <OrderCompleteNotificationPlanCard
                plan={notificationPlan}
                disabled={notifyLoading}
                onPrimaryAction={
                  notificationPlan.primaryAction === "enable_now"
                    ? () => {
                        void handleAllowNotification().then((ok) => {
                          if (ok) {
                            handleNotifyAllowed();
                          }
                        });
                      }
                    : notificationPlan.primaryAction === "open_modal"
                    ? openNotifyModal
                    : null
                }
              />
            ) : null}
          </div>
        </BetaFeatureGate>
        <div className="text-center py-4 bg-white shadow rounded-lg mt-4 mx-2 sm:mx-0">
          <p className="text-sm text-gray-600">
            {ORDER_COMPLETE_PAGE_COPY.orderLookupLead}
            <span className="text-sky-400 font-bold">
              {ORDER_COMPLETE_PAGE_COPY.orderLookupPhone}
            </span>{" "}
            {ORDER_COMPLETE_PAGE_COPY.orderLookupDivider}
            <span className="text-sky-400 font-bold">
              {ORDER_COMPLETE_PAGE_COPY.orderLookupPassword}
            </span>
            {ORDER_COMPLETE_PAGE_COPY.orderLookupTail}
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/my-orders"
            className="bg-sky-400 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-500 transition mb-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
          >
            {ORDER_COMPLETE_PAGE_COPY.viewMyOrders}
          </Link>
        </div>
      </main>
      {subscriptionInfo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 bg-white shadow-md rounded-lg p-3 text-sm"
        >
          <span>{ORDER_COMPLETE_PAGE_COPY.notifyEnabled}</span>
          <button
            onClick={handleUnsubscribe}
            className="ml-2 text-sky-500 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
          >
            {ORDER_COMPLETE_PAGE_COPY.disableNotification}
          </button>
        </div>
      )}
    </>
  );
}
