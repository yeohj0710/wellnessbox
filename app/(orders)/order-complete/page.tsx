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

export default function OrderComplete() {
  const [loginStatus, setLoginStatus] = useState<any>([]);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
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
        let impUid = localStorage.getItem("impUid") || params.get("imp_uid") || "";
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
        const existingOrder = await getOrderByPaymentId(paymentId);
        if (existingOrder) {
          setOrder(existingOrder);
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
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
          const pharmacyId = Number(localStorage.getItem("selectedPharmacyId"));
          const transactionType = "PAYMENT";
          const txId = paymentResponse.imp_uid || "";
          const status = ORDER_STATUS.PAYMENT_COMPLETE;
          const cartItems = JSON.parse(
            localStorage.getItem("cartItems") || "[]"
          );
          const allProducts = JSON.parse(
            localStorage.getItem("products") || "[]"
          );
          const orderItems = cartItems
            .map((cartItem: any) => {
              const product = allProducts.find(
                (prod: any) => prod.id === cartItem.productId
              );
              if (!product) return null;
              const matchingPharmacyProduct = product.pharmacyProducts.find(
                (pharmacyProduct: any) =>
                  pharmacyProduct.optionType === cartItem.optionType &&
                  pharmacyProduct.pharmacyId === pharmacyId
              );
              if (!matchingPharmacyProduct) return null;
              return {
                quantity: cartItem.quantity,
                pharmacyProductId: matchingPharmacyProduct.id,
              };
            })
            .filter((item: any) => item !== null);
          if (orderItems.length === 0) {
            alert("주문 상품 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
            localStorage.removeItem("impUid");
            returnToCart();
            return;
          }
          const deliveryFee = 3000;
          const calculatedTotalPrice = cartItems.reduce(
            (total: any, cartItem: any) => {
              const product = allProducts.find(
                (prod: any) => prod.id === cartItem.productId
              );
              if (!product) return total;
              const matchingPharmacyProduct = product.pharmacyProducts.find(
                (pharmacyProduct: any) =>
                  pharmacyProduct.optionType === cartItem.optionType &&
                  pharmacyProduct.pharmacyId === pharmacyId
              );
              if (!matchingPharmacyProduct) return total;
              return total + matchingPharmacyProduct.price * cartItem.quantity;
            },
            deliveryFee
          );
          const totalPrice = paymentResponse.amount;
          if (calculatedTotalPrice !== totalPrice) {
            alert("주문 금액과 결제 금액이 일치하지 않습니다.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
            localStorage.removeItem("impUid");
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
            createdOrder.orderItems.map((item: any) =>
              reducePharmacyProductStock(item.pharmacyProductId, item.quantity)
            )
          );
          setOrder(createdOrder);
          localStorage.removeItem("cartItems");
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
        } else {
          const paymentInfo = await response.json();
          const transaction = paymentInfo.response.payment.transactions?.[0];
          if (!transaction || transaction.status !== "PAID") {
            alert("결제에 실패하였습니다. 다시 시도해 주세요.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
            localStorage.removeItem("impUid");
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
          const pharmacyId = Number(localStorage.getItem("selectedPharmacyId"));
          const transactionType = "PAYMENT";
          const txId = transaction.id || "";
          const status = ORDER_STATUS.PAYMENT_COMPLETE;
          const cartItems = JSON.parse(
            localStorage.getItem("cartItems") || "[]"
          );
          const allProducts = JSON.parse(
            localStorage.getItem("products") || "[]"
          );
          const orderItems = cartItems
            .map((cartItem: any) => {
              const product = allProducts.find(
                (prod: any) => prod.id === cartItem.productId
              );
              if (!product) return null;
              const matchingPharmacyProduct = product.pharmacyProducts.find(
                (pharmacyProduct: any) =>
                  pharmacyProduct.optionType === cartItem.optionType &&
                  pharmacyProduct.pharmacyId === pharmacyId
              );
              if (!matchingPharmacyProduct) return null;
              return {
                quantity: cartItem.quantity,
                pharmacyProductId: matchingPharmacyProduct.id,
              };
            })
            .filter((item: any) => item !== null);
          if (orderItems.length === 0) {
            alert("주문 상품 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
            returnToCart();
            return;
          }
          const deliveryFee = 3000;
          const calculatedTotalPrice = cartItems.reduce(
            (total: any, cartItem: any) => {
              const product = allProducts.find(
                (prod: any) => prod.id === cartItem.productId
              );
              if (!product) return total;
              const matchingPharmacyProduct = product.pharmacyProducts.find(
                (pharmacyProduct: any) =>
                  pharmacyProduct.optionType === cartItem.optionType &&
                  pharmacyProduct.pharmacyId === pharmacyId
              );
              if (!matchingPharmacyProduct) return total;
              return total + matchingPharmacyProduct.price * cartItem.quantity;
            },
            deliveryFee
          );
          const totalPrice = transaction.amount.total;
          if (calculatedTotalPrice !== totalPrice) {
            alert("주문 금액과 결제 금액이 일치하지 않습니다.");
            localStorage.removeItem("paymentId");
            localStorage.removeItem("paymentMethod");
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
            createdOrder.orderItems.map((item: any) =>
              reducePharmacyProductStock(item.pharmacyProductId, item.quantity)
            )
          );
          setOrder(createdOrder);
          localStorage.removeItem("cartItems");
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
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
    <div className="w-full max-w-[640px] mx-auto">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 mt-12">
        결제가 완료되었습니다! 🎉
      </h1>
      <div className="bg-white shadow rounded-lg px-8 py-8">
        <h2 className="text-lg font-bold text-gray-700 mb-6">주문 상세 내역</h2>
        {order.orderItems.map((item: any, id: number) => {
          const pharmacyProduct = item.pharmacyProduct;
          const product = pharmacyProduct.product;
          return (
            <div key={id} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <Image
                    src={product.images?.[0] || "/placeholder.png"}
                    alt={product.name}
                    fill
                    sizes="512px"
                    className="object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {product.name} ({pharmacyProduct.optionType})
                  </h3>
                  <p className="text-xs text-gray-500">
                    {product.categories?.length
                      ? product.categories
                          .map((category: any) => category.name)
                          .join(", ")
                      : "카테고리 없음"}
                  </p>
                  <p className="text-sm font-bold text-sky-400 mt-1">
                    {pharmacyProduct.price.toLocaleString()}원 × {item.quantity}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-sky-400">
                {(pharmacyProduct.price * item.quantity).toLocaleString()}원
              </p>
            </div>
          );
        })}
        <div className="flex justify-end text-sm text-gray-600">
          <span>배송비</span>
          <span className="font-bold ml-2">3,000원</span>
        </div>
        <div className="flex justify-end gap-2 text-base font-bold mt-2">
          <span className="text-gray-700">총 결제 금액</span>
          <span className="text-sky-400">
            {order.totalPrice.toLocaleString()}원
          </span>
        </div>
        <h3 className="mb-2 font-bold mt-8 border-t pt-6">약국 정보</h3>
        <div className="flex flex-col text-sm gap-1 mt-4">
          <div className="flex items-center">
            <span className="w-20 font-bold text-gray-500">약국명</span>
            <span className="flex-1 text-gray-800">{order.pharmacy?.name}</span>
          </div>
          <div className="flex items-center">
            <span className="w-20 font-bold text-gray-500">약국 주소</span>
            <span className="flex-1 text-gray-800">
              {order.pharmacy?.address}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-20 font-bold text-gray-500">전화번호</span>
            <span className="flex-1 text-gray-800">
              {order.pharmacy?.phone}
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
  );
}
