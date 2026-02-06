"use client";

import FullPageLoader from "@/components/common/fullPageLoader";
import { createOrder } from "@/lib/order/mutations";
import { getOrderByPaymentId } from "@/lib/order/queries";
import { getClientIdLocal } from "@/app/chat/utils";
import { getLoginStatus } from "@/lib/useLoginStatus";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ORDER_STATUS } from "@/lib/order/orderStatus";
import Link from "next/link";
import OrderCancelledView from "@/components/order/orderCancelledView";
import OrderNotifyModal from "@/components/order/orderNotifyModal";
import OrderSummary from "@/components/order/orderSummary";
import { ensureCustomerPushSubscription } from "@/lib/push/customerSubscription";

interface SubscriptionInfo {
  endpoint: string;
}

export default function OrderComplete() {
  const [loginStatus, setLoginStatus] = useState<any>([]);
  const [order, setOrder] = useState<any | null>(null);
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

  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchgedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchgedLoginStatus);
    };
    fetchLoginStatus();
  }, []);

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
      localStorage.removeItem("paymentId");
      localStorage.removeItem("paymentMethod");
      localStorage.removeItem("impUid");
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
      try {
        let paymentId = localStorage.getItem("paymentId");
        let paymentMethod = localStorage.getItem("paymentMethod");
        const params = new URLSearchParams(window.location.search);
        let impUid =
          localStorage.getItem("impUid") || params.get("imp_uid") || "";
        if (impUid) localStorage.setItem("impUid", impUid);
        if (!paymentId) {
          paymentId =
            params.get("paymentId") || params.get("merchant_uid") || "";
          if (paymentId) localStorage.setItem("paymentId", paymentId);
        }
        if (!paymentMethod) {
          paymentMethod = params.get("method") || "";
          if (paymentMethod)
            localStorage.setItem("paymentMethod", paymentMethod);
        }
        if (!paymentId) {
          alert("결제 정보가 없어요.");
          localStorage.removeItem("impUid");
          returnToCart();
          return;
        }
        const lockKey = `oc:lock:${paymentId}`;
        if (sessionStorage.getItem(lockKey)) {
          return;
        }
        sessionStorage.setItem(lockKey, "1");
        const existingOrder = await getOrderByPaymentId(paymentId);
        if (existingOrder) {
          setOrder(existingOrder);
          setShowNotifyModal(true);
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");

          if (existingOrder.status === ORDER_STATUS.PAYMENT_COMPLETE) {
            clearCart();
          }

          sessionStorage.removeItem(lockKey);
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
        if (paymentMethod === "inicis") {
          if (!impUid) {
            alert("결제 정보가 없어요.");
            returnToCart();
            return;
          }
          const paymentInfo = await response.json();
          const paymentResponse = paymentInfo.response;
          if (!paymentResponse || paymentResponse.status !== "paid") {
            alert("결제에 실패하였어요. 다시 시도해 주세요.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
            localStorage.removeItem("impUid");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          const roadAddress = localStorage.getItem("roadAddress") || "";
          const detailAddress = localStorage.getItem("detailAddress") || "";
          const phone = `${localStorage.getItem("phonePart1") || ""}-${
            localStorage.getItem("phonePart2") || ""
          }-${localStorage.getItem("phonePart3") || ""}`;
          const password = localStorage.getItem("password") || "";
          const requestNotes = localStorage.getItem("requestNotes") || "";
          const entrancePassword =
            localStorage.getItem("entrancePassword") || "";
          const directions = localStorage.getItem("directions") || "";
          const transactionType = "PAYMENT";
          const txId = impUid || paymentResponse.imp_uid || "";
          const totalPrice = paymentResponse.amount ?? 0;
          const status = ORDER_STATUS.PAYMENT_COMPLETE;
          const pharmacyId =
            Number(localStorage.getItem("selectedPharmacyId") || "0") ||
            undefined;
          const rawCartItems =
            JSON.parse(localStorage.getItem("cartItems") || "[]") || [];

          const orderItems = rawCartItems
            .map((c: any) => {
              const pid = c.pharmacyProductId ?? resolvePharmacyProductId(c);
              return {
                pharmacyProductId: typeof pid === "string" ? Number(pid) : pid,
                quantity: Number(c.quantity ?? c.count ?? 1),
              };
            })
            .filter((oi: any) => !!oi.pharmacyProductId);

          if (!rawCartItems.length) {
            alert("장바구니가 비어 있어요.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          if (orderItems.length !== rawCartItems.length) {
            alert(
              "일부 상품의 약국 옵션을 확인할 수 없어요. 장바구니에서 다시 시도해 주세요."
            );
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }

          if (!orderItems.length) {
            alert("장바구니가 비어 있어요.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          const endpoint = getClientIdLocal();
          await createOrder({
            endpoint,
            roadAddress,
            detailAddress,
            phone,
            password,
            requestNotes,
            entrancePassword,
            directions,
            paymentId,
            transactionType,
            txId,
            totalPrice,
            status,
            pharmacyId,
            orderItems,
          });
          const fullOrder = await getOrderByPaymentId(paymentId as string);
          setOrder(fullOrder);
          setShowNotifyModal(true);
          clearCart();

          localStorage.removeItem("cartBackup");
          localStorage.removeItem("restoreCartFromBackup");
          localStorage.removeItem("checkoutInProgress");

          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
          sessionStorage.removeItem(lockKey);
        } else {
          const paymentInfo = await response.json();
          const transaction = paymentInfo.response.payment.transactions?.[0];
          if (!transaction || transaction.status !== "PAID") {
            alert("결제에 실패하였어요. 다시 시도해 주세요.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
            localStorage.removeItem("impUid");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          const roadAddress = localStorage.getItem("roadAddress") || "";
          const detailAddress = localStorage.getItem("detailAddress") || "";
          const phone = `${localStorage.getItem("phonePart1") || ""}-${
            localStorage.getItem("phonePart2") || ""
          }-${localStorage.getItem("phonePart3") || ""}`;
          const password = localStorage.getItem("password") || "";
          const requestNotes = localStorage.getItem("requestNotes") || "";
          const entrancePassword =
            localStorage.getItem("entrancePassword") || "";
          const directions = localStorage.getItem("directions") || "";
          const transactionType = "PAYMENT";
          const txId =
            paymentInfo?.response?.payment?.id ||
            transaction?.paymentId ||
            paymentId ||
            "";
          const totalPrice =
            transaction?.amount?.total ??
            paymentInfo?.response?.payment?.amount?.total ??
            0;
          const status = ORDER_STATUS.PAYMENT_COMPLETE;
          const pharmacyId =
            Number(localStorage.getItem("selectedPharmacyId") || "0") ||
            undefined;
          const rawCartItems =
            JSON.parse(localStorage.getItem("cartItems") || "[]") || [];

          const orderItems = rawCartItems
            .map((c: any) => {
              const pid = c.pharmacyProductId ?? resolvePharmacyProductId(c);
              return {
                pharmacyProductId: typeof pid === "string" ? Number(pid) : pid,
                quantity: Number(c.quantity ?? c.count ?? 1),
              };
            })
            .filter((oi: any) => !!oi.pharmacyProductId);

          if (!rawCartItems.length) {
            alert("장바구니가 비어 있어요.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          if (orderItems.length !== rawCartItems.length) {
            alert(
              "일부 상품의 약국 옵션을 확인할 수 없어요. 장바구니에서 다시 시도해 주세요."
            );
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }

          if (!orderItems.length) {
            alert("장바구니가 비어 있어요.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          const endpoint = getClientIdLocal();
          await createOrder({
            endpoint,
            roadAddress,
            detailAddress,
            phone,
            password,
            requestNotes,
            entrancePassword,
            directions,
            paymentId,
            transactionType,
            txId,
            totalPrice,
            status,
            pharmacyId,
            orderItems,
          });
          const fullOrder = await getOrderByPaymentId(paymentId as string);
          setOrder(fullOrder);
          setShowNotifyModal(true);
          clearCart();

          localStorage.removeItem("cartBackup");
          localStorage.removeItem("restoreCartFromBackup");
          localStorage.removeItem("checkoutInProgress");

          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
          sessionStorage.removeItem(lockKey);
        }
      } catch (error: any) {
        alert(
          `주문 정보를 불러오는 중 오류가 발생했습니다: ${
            error.message || error
          }`
        );
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
    window.scrollTo(0, 0);
  }, []);

  const resolvePharmacyProductId = (cartItem: any): number | undefined => {
    const products = JSON.parse(localStorage.getItem("products") || "[]");
    const selectedPharmacyId = Number(
      localStorage.getItem("selectedPharmacyId") || "0"
    );
    const product = products.find((p: any) => p.id === cartItem.productId);
    if (!product) return undefined;
    const pp = product.pharmacyProducts?.find(
      (x: any) =>
        (x.pharmacyId ?? x.pharmacy?.id) === selectedPharmacyId &&
        x.optionType === cartItem.optionType
    );
    return pp?.id;
  };

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
      <div className="w-full max-w-[640px] mx-2 sm:mx-auto">
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
            className="bg-sky-400 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-500 transition mb-12"
          >
            내 주문 조회하기
          </Link>
        </div>
      </div>
      {subscriptionInfo && (
        <div className="fixed bottom-4 right-4 bg-white shadow-md rounded-lg p-3 text-sm">
          <span>배송 알림이 켜져 있어요.</span>
          <button
            onClick={handleUnsubscribe}
            className="ml-2 text-sky-500 underline"
          >
            알림 끄기
          </button>
        </div>
      )}
    </>
  );
}
