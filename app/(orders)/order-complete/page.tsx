"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import FullPageLoader from "@/components/common/fullPageLoader";
import OrderCancelledView from "@/components/order/orderCancelledView";
import OrderNotifyModal from "@/components/order/orderNotifyModal";
import OrderSummary from "@/components/order/orderSummary";
import { ORDER_COMPLETE_PAGE_COPY } from "./orderComplete.copy";
import { useOrderCompleteBootstrap } from "./useOrderCompleteBootstrap";
import { useOrderCompleteNotifications } from "./useOrderCompleteNotifications";

export default function OrderComplete() {
  const router = useRouter();
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const pushHome = useCallback(() => {
    router.push("/");
  }, [router]);
  const openNotifyModal = useCallback(() => {
    setShowNotifyModal(true);
  }, []);
  const closeNotifyModal = useCallback(() => {
    setShowNotifyModal(false);
  }, []);
  const { order, loading, cancelled, returnToCart } =
    useOrderCompleteBootstrap({
      pushHome,
      openNotifyModal,
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

  if (loading || (!cancelled && !order)) return <FullPageLoader />;
  if (cancelled) return <OrderCancelledView onReturn={returnToCart} />;

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
