"use client";

import FullPageLoader from "@/components/common/fullPageLoader";
import { createOrder, getOrderByPaymentId } from "@/lib/order";
import { reducePharmacyProductStock } from "@/lib/product";
import { getLoginStatus } from "@/lib/useLoginStatus";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ORDER_STATUS } from "@/lib/order/orderStatus";
import Link from "next/link";
import OrderCancelledView from "@/components/order/orderCancelledView";
import OrderNotifyModal from "@/components/order/orderNotifyModal";
import OrderSummary from "@/components/order/orderSummary";

interface SubscriptionInfo {
  endpoint: string;
}

function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64Safe);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

function uint8ArrayToUrlBase64(u8: Uint8Array) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getSubAppKeyBase64(reg: ServiceWorkerRegistration) {
  const sub = await reg.pushManager.getSubscription();
  const ab = (sub as any)?.options?.applicationServerKey as
    | ArrayBuffer
    | undefined;
  if (!ab) return null;
  return uint8ArrayToUrlBase64(new Uint8Array(ab));
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
  const router = useRouter();

  const returnToCart = () => {
    if (typeof window !== "undefined") localStorage.setItem("openCart", "true");
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
          alert("결제 정보가 없습니다.");
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
          localStorage.removeItem("cartItems");
          window.dispatchEvent(new Event("cartUpdated"));
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
            alert("결제 정보가 없습니다.");
            returnToCart();
            return;
          }
          const paymentInfo = await response.json();
          const paymentResponse = paymentInfo.response;
          if (!paymentResponse || paymentResponse.status !== "paid") {
            alert("결제에 실패하였습니다. 다시 시도해 주세요.");
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
            alert("장바구니가 비어 있습니다.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          if (orderItems.length !== rawCartItems.length) {
            alert(
              "일부 상품의 약국 옵션을 확인할 수 없습니다. 장바구니에서 다시 시도해 주세요."
            );
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }

          if (!orderItems.length) {
            alert("장바구니가 비어 있습니다.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          await createOrder({
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
          await Promise.all(
            orderItems.map((item: any) =>
              reducePharmacyProductStock(item.pharmacyProductId, item.quantity)
            )
          );
          const fullOrder = await getOrderByPaymentId(paymentId as string);
          setOrder(fullOrder);
          setShowNotifyModal(true);
          localStorage.removeItem("cartItems");
          window.dispatchEvent(new Event("cartUpdated"));
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
          sessionStorage.removeItem(lockKey);
        } else {
          const paymentInfo = await response.json();
          const transaction = paymentInfo.response.payment.transactions?.[0];
          if (!transaction || transaction.status !== "PAID") {
            alert("결제에 실패하였습니다. 다시 시도해 주세요.");
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
          const totalPrice = paymentInfo?.response?.payment?.amount?.total ?? 0;
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
            alert("장바구니가 비어 있습니다.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          if (orderItems.length !== rawCartItems.length) {
            alert(
              "일부 상품의 약국 옵션을 확인할 수 없습니다. 장바구니에서 다시 시도해 주세요."
            );
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }

          if (!orderItems.length) {
            alert("장바구니가 비어 있습니다.");
            sessionStorage.removeItem(lockKey);
            returnToCart();
            return;
          }
          await createOrder({
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
          await Promise.all(
            orderItems.map((item: any) =>
              reducePharmacyProductStock(item.pharmacyProductId, item.quantity)
            )
          );
          const fullOrder = await getOrderByPaymentId(paymentId as string);
          setOrder(fullOrder);
          setShowNotifyModal(true);
          localStorage.removeItem("cartItems");
          window.dispatchEvent(new Event("cartUpdated"));
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
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

  const registerAndActivateSW = async () => {
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register("/sw.js"));
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      await new Promise<void>((resolve) => {
        const onChange = () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              onChange
            );
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener("controllerchange", onChange);
      });
    }
    return reg;
  };

  const subscribePush = async () => {
    try {
      if (!order) return;
      if (!("serviceWorker" in navigator)) return;
      const reg = await registerAndActivateSW();
      let existing = await reg.pushManager.getSubscription();
      const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!appKey) return;
      const storedKey = localStorage.getItem("vapidKey") || "";
      const subAppKey = existing ? await getSubAppKeyBase64(reg) : null;
      const mismatch =
        !!existing &&
        (storedKey !== appKey || (subAppKey && subAppKey !== appKey));
      if (mismatch && existing) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        existing = null;
      }
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(appKey),
        }));
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, subscription: sub }),
      });
      localStorage.setItem("vapidKey", appKey);
      setSubscriptionInfo({ endpoint: sub.endpoint });
    } catch {}
  };

  const handleAllowNotification = async () => {
    setNotifyLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribePush();
        try {
          if (order) {
            await fetch("/api/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                status: ORDER_STATUS.PAYMENT_COMPLETE,
              }),
            });
          }
        } catch {}
      } else {
        alert("브라우저 설정에서 알림을 허용할 수 있어요.");
      }
      setShowNotifyModal(false);
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
          body: JSON.stringify({ orderId: order.id, endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    }
    localStorage.removeItem("vapidKey");
    setSubscriptionInfo(null);
  };

  if (loading || (!cancelled && !order)) return <FullPageLoader />;
  if (cancelled) return <OrderCancelledView onReturn={returnToCart} />;
  return (
    <>
      {showNotifyModal && (
        <OrderNotifyModal
          onAllow={handleAllowNotification}
          onClose={() => setShowNotifyModal(false)}
          loading={notifyLoading}
        />
      )}
      <div className="w-full max-w-[640px] mx-auto">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
          결제가 완료되었습니다! 🎉
        </h1>
        <OrderSummary order={order} />
        <div className="text-center py-4 bg-white shadow rounded-lg mt-4">
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
