"use client";

import FullPageLoader from "@/components/fullPageLoader";
import { createOrder, getOrderByPaymentId } from "@/lib/order";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderComplete() {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const goBackOrDefault = () => {
    if (document.referrer) {
      router.back();
    } else {
      router.push("/");
    }
  };
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const paymentId = localStorage.getItem("paymentId");
        if (!paymentId) {
          alert("결제 정보가 없습니다.");
          goBackOrDefault();
          return;
        }
        const existingOrder = await getOrderByPaymentId(paymentId);
        if (existingOrder) {
          alert(
            "해당 주문은 이미 접수되었습니다. '내 주문 조회'를 통해 확인해 주세요."
          );
          router.push("/my-orders");
          return;
        }
        const response = await fetch(
          `/api/get-payment-info?paymentId=${paymentId}`
        );
        const paymentInfo = await response.json();
        const transaction = paymentInfo.payment.transactions?.[0];
        if (!transaction || transaction.status !== "PAID") {
          alert("결제에 실패하였습니다. 다시 시도해 주세요.");
          goBackOrDefault();
          return;
        }
        const roadAddress = localStorage.getItem("roadAddress_input") || "";
        const detailAddress = localStorage.getItem("detailAddress_input") || "";
        const phone = `${localStorage.getItem(
          "phonePart1_input"
        )}-${localStorage.getItem("phonePart2_input")}-${localStorage.getItem(
          "phonePart3_input"
        )}`;
        const password = localStorage.getItem("password_input") || "";
        const requestNotes = localStorage.getItem("requestNotes_input") || "";
        const entrancePassword =
          localStorage.getItem("entrancePassword_input") || "";
        const directions = localStorage.getItem("diretions_input") || "";
        const pharmacyId = Number(localStorage.getItem("selectedPharmacyId"));
        const transactionType = "PAYMENT";
        const txId = transaction.id || "";
        const status = "결제 완료";
        const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
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
          goBackOrDefault();
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
        setOrder(createdOrder);
        localStorage.removeItem("cartItems");
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
                <img
                  src={product.images?.[0] || "/placeholder.png"}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {product.categories?.length
                      ? product.categories
                          .map((category: any) => category.name)
                          .join(", ")
                      : "옵션 없음"}
                  </p>
                  <p className="text-sm font-bold text-sky-400 mt-1">
                    ₩{pharmacyProduct.price.toLocaleString()} × {item.quantity}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-sky-400">
                ₩{(pharmacyProduct.price * item.quantity).toLocaleString()}
              </p>
            </div>
          );
        })}
        <div className="flex justify-end text-sm text-gray-600">
          <span>배송비</span>
          <span className="font-bold ml-2">₩3,000</span>
        </div>
        <div className="flex justify-end gap-2 text-base font-bold mt-2">
          <span className="text-gray-700">총 결제 금액</span>
          <span className="text-sky-400">
            ₩{order.totalPrice.toLocaleString()}
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
