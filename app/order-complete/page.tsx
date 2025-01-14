"use client";

import { createOrder, getOrderByPaymentId } from "@/lib/order";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderComplete() {
  const [order, setOrder] = useState<any | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
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
          alert("결제에 실패했습니다.");
          goBackOrDefault();
          return;
        }
        console.log(transaction);
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
        const pharmacyIdx = Number(localStorage.getItem("selectedPharmacyIdx"));
        const transactionType = "PAYMENT";
        const txId = transaction.id || "";
        const status = "결제 완료";
        const storedCartItems = JSON.parse(
          localStorage.getItem("cartItems") || "[]"
        );
        setCartItems(storedCartItems);
        const orderItems = storedCartItems.map((item: any) => ({
          productId: item.idx,
          quantity: item.quantity,
        }));
        const deliveryFee = 3000;
        const calculatedTotalPrice =
          storedCartItems.reduce((sum: number, item: any) => {
            return sum + item.price * item.quantity;
          }, 0) + deliveryFee;
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
          pharmacyIdx,
          paymentId,
          transactionType,
          txId,
          status,
          orderItems,
          totalPrice,
        });
        setOrder(createdOrder);
      } catch (err) {
        alert("주문 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
    window.scrollTo(0, 0);
  }, []);
  if (!order) return null;
  const { roadAddress, detailAddress, phone, totalPrice } = order;
  return loading || !order ? (
    <div className="w-full max-w-[640px] mx-auto mt-4 px-3">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between mb-4 border-b pb-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
            <div>
              <div className="w-32 h-4 bg-gray-300 mb-2"></div>
              <div className="w-24 h-4 bg-gray-300"></div>
            </div>
          </div>
          <div className="w-16 h-4 bg-gray-300"></div>
        </div>
      ))}
    </div>
  ) : (
    <div className="w-full max-w-[640px] mx-auto mt-4 px-3">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-4 mt-8">
        결제가 완료되었습니다! 🎉
      </h1>
      <div className="px-4 py-4 bg-white shadow rounded-lg">
        <h2 className="text-lg font-bold text-gray-700 mb-4">주문 상세 내역</h2>
        {cartItems.map((item: any, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between mb-4 border-b pb-4"
          >
            <div className="flex items-center gap-4">
              <img
                src={item.images?.[0] || "/placeholder.png"}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <h3 className="text-sm font-bold text-gray-800">{item.name}</h3>{" "}
                <p className="text-xs text-gray-500">
                  {item.categories
                    ?.map((category: any) => category.name)
                    .join(", ") || ""}{" "}
                </p>
                <p className="text-sm font-bold text-sky-400 mt-1">
                  ₩{item.price.toLocaleString()} x {item.quantity}{" "}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-sky-400">
              ₩{(item.price * item.quantity).toLocaleString()}
            </p>
          </div>
        ))}
        <div className="flex justify-end mt-4 text-sm text-gray-600 gap-1">
          <span>배송비</span>
          <span className="font-bold">₩3,000</span>
        </div>
        <div className="mt-4 text-right">
          <p className="text-base text-gray-600">
            주소: {roadAddress} {detailAddress}
          </p>
          <p className="text-base text-gray-600 mt-1">연락처: {phone}</p>
          <h3 className="flex justify-end gap-2 text-lg font-bold mt-2">
            <span className="text-gray-700">총 결제 금액</span>
            <span className="text-sky-400">₩{totalPrice.toLocaleString()}</span>
          </h3>
        </div>
      </div>
      <div className="px-4 py-4 bg-white shadow rounded-lg mt-4">
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
