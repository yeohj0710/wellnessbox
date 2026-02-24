"use client";

import FullPageLoader from "@/components/common/fullPageLoader";
import { createOrder } from "@/lib/order/mutations";
import { getOrderByPaymentId } from "@/lib/order/queries";
import { getClientIdLocal } from "@/app/chat/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ORDER_STATUS } from "@/lib/order/orderStatus";
import Link from "next/link";
import OrderCancelledView from "@/components/order/orderCancelledView";
import OrderNotifyModal from "@/components/order/orderNotifyModal";
import OrderSummary from "@/components/order/orderSummary";
import { ensureCustomerPushSubscription } from "@/lib/push/customerSubscription";
import {
  clearCheckoutProgressStorage,
  clearPaymentStorage,
  prepareOrderDraftFromStorage,
  readPaymentContext,
  resolvePaymentOutcome,
} from "./orderCompleteFlow";

interface SubscriptionInfo {
  endpoint: string;
}

type OrderRecord = NonNullable<Awaited<ReturnType<typeof getOrderByPaymentId>>>;

async function readPaymentInfoJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function readApiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error.trim() : null;
}

export default function OrderComplete() {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const endpointRef = useRef<string | null>(null);
  const router = useRouter();

  const clearCart = () => {
    localStorage.removeItem("cartItems");
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const returnToCart = () => {
    if (typeof window !== "undefined") {
      const backup = localStorage.getItem("cartBackup");
      if (backup && backup !== "[]") {
        localStorage.setItem("cartItems", backup);
        window.dispatchEvent(new Event("cartUpdated"));
      }
      localStorage.setItem("restoreCartFromBackup", "1");
      localStorage.setItem("openCart", "true");
    }
    router.push("/");
  };

  const createOrderFromPaymentOutcome = async (input: {
    paymentId: string;
    txId: string;
    totalPrice: number;
  }) => {
    const draft = prepareOrderDraftFromStorage();
    const { rawCartItems, orderItems } = draft;

    if (!rawCartItems.length) {
      alert("장바구니가 비어 있어요.");
      returnToCart();
      return;
    }
    if (orderItems.length !== rawCartItems.length) {
      alert(
        "일부 상품의 약국 옵션을 확인할 수 없어 장바구니에서 다시 시도해 주세요."
      );
      returnToCart();
      return;
    }
    if (!orderItems.length) {
      alert("장바구니가 비어 있어요.");
      returnToCart();
      return;
    }

    const endpoint = getClientIdLocal();
    await createOrder({
      endpoint,
      roadAddress: draft.roadAddress,
      detailAddress: draft.detailAddress,
      phone: draft.phone,
      password: draft.password,
      requestNotes: draft.requestNotes,
      entrancePassword: draft.entrancePassword,
      directions: draft.directions,
      paymentId: input.paymentId,
      transactionType: "PAYMENT",
      txId: input.txId,
      totalPrice: input.totalPrice,
      status: ORDER_STATUS.PAYMENT_COMPLETE,
      pharmacyId: draft.pharmacyId,
      orderItems,
    });

    const fullOrder = await getOrderByPaymentId(input.paymentId);
    setOrder(fullOrder);
    setShowNotifyModal(true);
    clearCart();
    clearCheckoutProgressStorage();
    clearPaymentStorage();
  };

  useEffect(() => {
    if (!order) return;
    try {
      const fallbackPhone = `${localStorage.getItem("phonePart1") || ""}-${
        localStorage.getItem("phonePart2") || ""
      }-${localStorage.getItem("phonePart3") || ""}`;
      const normalizedPhone = String(order.phone || fallbackPhone || "").replace(
        /\D/g,
        ""
      );
      if (normalizedPhone) {
        localStorage.setItem("customerAccountKey", normalizedPhone);
      }
    } catch {}
  }, [order]);

  useEffect(() => {
    if (cancelled) {
      clearPaymentStorage();
    }
  }, [cancelled]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("imp_success") === "false" ||
      params.get("cancelled") === "true" ||
      params.get("code")
    ) {
      setCancelled(true);
      localStorage.setItem("restoreCartFromBackup", "1");
      setLoading(false);
      return;
    }
    const fetchOrder = async () => {
      let lockKey = "";
      let lockAcquired = false;
      try {
        const params = new URLSearchParams(window.location.search);
        const { paymentId, paymentMethod, impUid } = readPaymentContext(params);
        if (!paymentId) {
          alert("결제 정보가 없어요.");
          localStorage.removeItem("impUid");
          returnToCart();
          return;
        }
        if (!paymentMethod) {
          alert("결제 수단 정보가 없어요.");
          clearPaymentStorage();
          returnToCart();
          return;
        }
        lockKey = `oc:lock:${paymentId}`;
        if (sessionStorage.getItem(lockKey)) {
          return;
        }
        sessionStorage.setItem(lockKey, "1");
        lockAcquired = true;
        const existingOrder = await getOrderByPaymentId(paymentId);
        if (existingOrder) {
          setOrder(existingOrder);
          setShowNotifyModal(true);
          clearPaymentStorage();

          if (existingOrder.status === ORDER_STATUS.PAYMENT_COMPLETE) {
            clearCart();
          }

          return;
        }
        if (paymentMethod === "inicis" && !impUid) {
          alert("결제 정보가 없어요.");
          returnToCart();
          return;
        }
        const response = await fetch("/api/get-payment-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: paymentMethod === "inicis" ? impUid : paymentId,
            paymentMethod,
          }),
        });
        const paymentInfo = await readPaymentInfoJson(response);
        if (!response.ok || !paymentInfo) {
          const fallbackError =
            "결제 정보를 확인하지 못했어요. 다시 시도해 주세요.";
          alert(readApiErrorMessage(paymentInfo) ?? fallbackError);
          clearPaymentStorage();
          returnToCart();
          return;
        }
        const paymentOutcome = resolvePaymentOutcome(
          paymentMethod,
          paymentInfo,
          paymentId,
          impUid
        );
        if (!paymentOutcome) {
          alert("결제에 실패했어요. 다시 시도해 주세요.");
          clearPaymentStorage();
          returnToCart();
          return;
        }

        await createOrderFromPaymentOutcome({
          paymentId,
          txId: paymentOutcome.txId,
          totalPrice: paymentOutcome.totalPrice,
        });
      } catch (error: any) {
        alert(
          `주문 정보를 불러오는 중 오류가 발생했습니다: ${
            error.message || error
          }`
        );
      } finally {
        if (lockAcquired && lockKey) {
          sessionStorage.removeItem(lockKey);
        }
        setLoading(false);
      }
    };
    fetchOrder();
    window.scrollTo(0, 0);
  }, []);

  const subscribePush = async () => {
    try {
      if (!order) return;
      const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!appKey) return;
      const sub = await ensureCustomerPushSubscription({ silent: true });
      if (!sub) return "";
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          subscription: sub,
          role: "customer",
        }),
      });
      localStorage.setItem("vapidKey", appKey);
      return sub.endpoint as string;
    } catch {
      return "";
    }
  };

  const handleAllowNotification = async () => {
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
        setShowNotifyModal(false);
        return true;
      } else {
        alert("브라우저 설정에서 알림을 허용할 수 있어요.");
        setShowNotifyModal(false);
        return true;
      }
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscriptionInfo || !order) return;
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            endpoint: sub.endpoint,
            role: "customer",
          }),
        });
      }
    }
    if (order) localStorage.setItem(`notifyOff:${order.id}`, "true");
    setSubscriptionInfo(null);
  };

  if (loading || (!cancelled && !order)) return <FullPageLoader />;
  if (cancelled) return <OrderCancelledView onReturn={returnToCart} />;
  return (
    <>
      {showNotifyModal && order && (
        <OrderNotifyModal
          orderId={order.id}
          onAllow={handleAllowNotification}
          onAllowed={() => {
            if (endpointRef.current)
              setSubscriptionInfo({ endpoint: endpointRef.current });
          }}
          onClose={() => setShowNotifyModal(false)}
          loading={notifyLoading}
        />
      )}
      <main className="w-full max-w-[640px] mx-2 sm:mx-auto">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
          결제가 완료되었습니다! 🎉
        </h1>
        <OrderSummary order={order} />
        <div className="text-center py-4 bg-white shadow rounded-lg mt-4 mx-2 sm:mx-0">
          <p className="text-sm text-gray-600">
            결제 시 입력한
            <span className="text-sky-400 font-bold"> 전화번호</span>와
            <span className="text-sky-400 font-bold"> 비밀번호</span>로 주문을
            쉽게 조회할 수 있어요.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/my-orders"
            className="bg-sky-400 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-500 transition mb-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
          >
            내 주문 조회하기
          </Link>
        </div>
      </main>
      {subscriptionInfo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 bg-white shadow-md rounded-lg p-3 text-sm"
        >
          <span>배송 알림이 켜져 있어요.</span>
          <button
            onClick={handleUnsubscribe}
            className="ml-2 text-sky-500 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
          >
            알림 끄기
          </button>
        </div>
      )}
    </>
  );
}
