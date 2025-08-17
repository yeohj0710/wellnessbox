"use client";

import FullPageLoader from "@/components/common/fullPageLoader";
import { createOrder, getOrderByPaymentId } from "@/lib/order";
import { reducePharmacyProductStock } from "@/lib/product";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ORDER_STATUS } from "@/lib/order/orderStatus";

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
          const createdOrder = await createOrder({
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
          const createdOrder = await createOrder({
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

  const base64ToUint8Array = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64Safe);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      output[i] = rawData.charCodeAt(i);
    }
    return output;
  };

  const subscribePush = async () => {
    try {
      if (!order) return;
      if ("serviceWorker" in navigator) {
        const reg =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.register("/sw.js"));
        let existing = await reg.pushManager.getSubscription();
        const appKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
        if (!appKey) return;
        const storedKey = localStorage.getItem("vapidKey");
        if (existing && storedKey !== appKey) {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAllowNotification = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await subscribePush();
    } else {
      alert("브라우저 설정에서 알림을 허용할 수 있어요.");
    }
    setShowNotifyModal(false);
  };

  const handleUnsubscribe = async () => {
    if (!subscriptionInfo) return;
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    }
    localStorage.removeItem("vapidKey");
    setSubscriptionInfo(null);
  };

  if (loading) return <FullPageLoader />;
  if (cancelled)
    return (
      <div className="w-full max-w-[640px] mx-auto">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
          결제가 취소되었습니다.
        </h1>
        <div className="text-center mt-6">
          <button
            onClick={returnToCart}
            className="bg-sky-400 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-500 transition mb-12"
          >
            장바구니로 돌아가기
          </button>
        </div>
      </div>
    );
  return (
    <>
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4">
              배송 알림을 받으시겠어요?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              알림을 허용하면 배송 진행 상황을 알려드려요. 브라우저에서 알림을
              거부했다면 설정에서 다시 허용할 수 있어요.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="px-4 py-2 text-sm bg-gray-200 rounded"
              >
                나중에
              </button>
              <button
                onClick={handleAllowNotification}
                className="px-4 py-2 text-sm bg-sky-400 text-white rounded"
              >
                허용
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-[640px] mx-auto">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
          결제가 완료되었습니다! 🎉
        </h1>
        <div className="bg-white shadow rounded-lg px-8 py-8">
          <h2 className="text-lg font-bold text-gray-700 mb-6">
            주문 상세 내역
          </h2>

          {(() => {
            const invalid =
              !!order &&
              (!Array.isArray(order.orderItems) ||
                order.orderItems.length === 0 ||
                order.orderItems.some(
                  (i: any) =>
                    !i?.pharmacyProduct?.product || !i?.pharmacyProductId
                ));

            if (invalid) {
              return (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  주문 데이터가 올바르지 않습니다. 고객센터로 문의해 주세요.
                  <div className="mt-3 flex gap-2">
                    <Link
                      href="/about/contact"
                      className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                    >
                      문의하기
                    </Link>
                    <button
                      onClick={() => router.push("/")}
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs"
                    >
                      홈으로 가기
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <>
                {order?.orderItems.map((item: any, id: number) => {
                  const pharmacyProduct = item?.pharmacyProduct;
                  const product = pharmacyProduct?.product;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between mb-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16">
                          <Image
                            src={product?.images?.[0] || "/placeholder.png"}
                            alt={product?.name || "상품"}
                            fill
                            sizes="512px"
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800">
                            {product?.name || "상품"}{" "}
                            {pharmacyProduct?.optionType
                              ? `(${pharmacyProduct?.optionType})`
                              : ""}
                          </h3>
                          <p className="text-xs text-gray-500">
                            수량 {item?.quantity ?? 0}개
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800">
                          {(pharmacyProduct?.price || 0).toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center mb-2">
              <span className="w-20 font-bold text-gray-500">총 결제금액</span>
              <span className="flex-1 text-gray-800">
                {(order?.totalPrice || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex items-center mb-2">
              <span className="w-20 font-bold text-gray-500">수령주소</span>
              <span className="flex-1 text-gray-800">
                {order?.roadAddress} {order?.detailAddress}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-20 font-bold text-gray-500">전화번호</span>
              <span className="flex-1 text-gray-800">
                {order?.pharmacy?.phone}
              </span>
            </div>
          </div>
        </div>
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
