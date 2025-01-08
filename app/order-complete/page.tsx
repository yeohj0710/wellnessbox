"use client";

import { useEffect, useState } from "react";

export default function OrderComplete() {
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const userAddress = searchParams.get("userAddress");
    const userContact = searchParams.get("userContact");
    const totalPrice = parseFloat(searchParams.get("totalPrice") || "0");
    const cartItems = JSON.parse(
      decodeURIComponent(searchParams.get("cartItems") || "[]")
    );
    setPaymentDetails({
      userAddress,
      userContact,
      totalPrice,
      cartItems,
    });
  }, []);
  if (!paymentDetails) {
    return <span className="mt-8">처리 중...</span>;
  }
  const { userAddress, userContact, totalPrice, cartItems } = paymentDetails;
  return (
    <div className="w-full max-w-[640px] mx-auto mt-4 px-3">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-4 mt-8">
        결제가 완료되었습니다! 🎉
      </h1>
      <div className="px-4 py-4 bg-white shadow rounded-lg">
        <h2 className="text-lg font-bold text-gray-700 mb-2">주문 상세 내역</h2>
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
                <h3 className="text-sm font-bold text-gray-800">{item.name}</h3>
                <p className="text-xs text-gray-500">
                  {item.options.join(", ")}
                </p>
                <p className="text-sm font-bold text-gray-700 mt-1">
                  ₩{item.price.toLocaleString()} x {item.quantity}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-800">
              ₩{(item.price * item.quantity).toLocaleString()}
            </p>
          </div>
        ))}
        <div className="mt-4 text-right">
          <p className="text-base text-gray-600">주소: {userAddress}</p>
          <p className="text-base text-gray-600">연락처: {userContact}</p>
          <h3 className="text-lg font-bold text-gray-800">
            총 결제 금액: ₩{totalPrice.toLocaleString()}
          </h3>
        </div>
      </div>
      <button
        className="w-full bg-sky-400 text-white py-2 mt-4 rounded-lg font-bold"
        onClick={() => (window.location.href = "/")}
      >
        홈으로 이동
      </button>
    </div>
  );
}
