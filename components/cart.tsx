"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import CartTopBar from "./cartTopBar";

declare global {
  interface Window {
    IMP: {
      init: (merchantId: string) => void;
      request_pay: (
        options: {
          pg: string;
          pay_method: string;
          merchant_uid: string;
          name: string;
          amount: number;
          buyer_email: string;
          buyer_name: string;
          buyer_tel: string;
          buyer_addr: string;
          buyer_postcode: string;
        },
        callback: (response: {
          success: boolean;
          imp_uid?: string;
          error_msg?: string;
        }) => void
      ) => void;
    };
  }
}

type CartItem = {
  id: number;
  name: string;
  price: number;
  options: string[];
  quantity: number;
  imageUrl?: string;
};

type CartProps = {
  cartItems: CartItem[];
  onBack: () => void;
  onUpdateCart: (items: CartItem[]) => void;
};

export default function Cart({ cartItems, onBack, onUpdateCart }: CartProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const handlePayment = () => {
    if (!sdkLoaded || !window.IMP) {
      alert("포트원 SDK 로드 실패");
      return;
    }
    const IMP = window.IMP;
    IMP.init(process.env.NEXT_PUBLIC_MERCHANT_ID!);
    IMP.request_pay(
      {
        pg: "uplus",
        pay_method: "card",
        merchant_uid: `mid_${new Date().getTime()}`,
        name: "건강기능식품 결제",
        amount: totalPrice,
        buyer_email: "buyer@example.com",
        buyer_name: "user",
        buyer_tel: "010-1234-5678",
        buyer_addr: "서울 강남구 삼성동",
        buyer_postcode: "123-456",
      },
      (rsp: { success: boolean; imp_uid?: string; error_msg?: string }) => {
        if (rsp.success) {
          alert(`결제가 완료되었습니다! 결제 ID: ${rsp.imp_uid}`);
        } else {
        }
      }
    );
  };
  useEffect(() => {
    if (window.IMP) {
      setSdkLoaded(true);
    }
  }, []);
  return (
    <div
      className={`w-full max-w-[640px] mx-auto bg-white ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      <Script
        src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
        onLoad={() => {
          console.log("IAMPORT script loaded");
          setSdkLoaded(true);
        }}
        strategy="afterInteractive"
      />
      <CartTopBar onBack={onBack} />
      <div className="mt-6 px-4">
        <h2 className="text-lg font-bold pb-4 border-b mb-4">선택한 상품</h2>
      </div>
      <div className="space-y-4 px-4">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4 border-b pb-4">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-16 h-16 rounded-md object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-gray-300 flex items-center justify-center text-xs text-gray-500">
                이미지 없음
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-bold">{item.name}</h2>
              <p className="text-sm text-gray-500">{item.options.join(", ")}</p>
              <p className="font-bold text-lg">
                ₩{item.price.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const updatedItems = cartItems.map((i) =>
                    i.id === item.id && i.quantity > 1
                      ? { ...i, quantity: i.quantity - 1 }
                      : i
                  );
                  onUpdateCart(updatedItems);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-lg"
              >
                -
              </button>
              <span className="font-bold">{item.quantity}</span>
              <button
                onClick={() => {
                  const updatedItems = cartItems.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                  );
                  onUpdateCart(updatedItems);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-lg font-bold p-4">내 지역 입력</h2>
      <div className="px-4">{/* 지역 입력 UI */}</div>
      <h2 className="text-lg font-bold p-4">연락처 입력</h2>
      <div className="px-4">{/* 연락처 입력 UI */}</div>
      <div className="fixed bottom-0 left-0 w-full bg-sky-400 text-white p-4 flex justify-between items-center">
        <span className="font-bold">₩{totalPrice.toLocaleString()}</span>
        <button
          onClick={handlePayment}
          className="bg-white text-sky-400 px-6 py-2 rounded-full font-semibold shadow-lg hover:bg-sky-500 transition"
        >
          결제하기
        </button>
      </div>
    </div>
  );
}
