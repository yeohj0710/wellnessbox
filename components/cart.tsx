"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { TrashIcon } from "@heroicons/react/16/solid";

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

export default function Cart({ cartItems, onBack, onUpdateCart }: any) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [userContact, setUserContact] = useState("");
  const [showModal, setShowModal] = useState(false);
  const totalPrice = cartItems.reduce(
    (acc: any, item: any) => acc + item.price * item.quantity,
    0
  );
  const handlePayment = () => {
    if (!sdkLoaded || !window.IMP) {
      alert("포트원 SDK 로드 실패");
      return;
    }
    if (!userAddress || !userContact) {
      alert("주소와 연락처를 입력해주세요.");
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
        buyer_tel: userContact,
        buyer_addr: userAddress,
        buyer_postcode: "123-456",
      },
      (rsp: { success: boolean; imp_uid?: string; error_msg?: string }) => {
        if (rsp.success) {
          alert(`결제가 완료되었습니다! 결제 ID: ${rsp.imp_uid}`);
        } else {
          alert(`결제에 실패하였습니다. 오류 메시지: ${rsp.error_msg}`);
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
      <div className="w-full max-w-[640px] mx-auto bg-sky-400 h-12 sm:h-14 flex items-center px-4 mb-6 border-b border-gray-200">
        <button onClick={onBack} className="text-white text-xl mr-4 font-bold">
          ←
        </button>
        <h1 className="sm:text-lg font-bold text-white">장바구니</h1>
      </div>
      <div className="px-4">
        <h2 className="text-lg font-bold pb-4 border-b mb-4">선택한 상품</h2>
      </div>
      <div className="space-y-4 px-4">
        {cartItems.map((item: any) => (
          <div key={item.idx} className="flex items-center gap-4 border-b pb-4">
            {item.images && item.images.length > 0 ? (
              <img
                src={item.images[0]}
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
                  const updatedItems = cartItems.map((i: any) =>
                    i.idx === item.idx && i.quantity > 1
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
                  const updatedItems = cartItems.map((i: any) =>
                    i.idx === item.idx ? { ...i, quantity: i.quantity + 1 } : i
                  );
                  onUpdateCart(updatedItems);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-lg"
              >
                +
              </button>
              <button
                onClick={() => {
                  const updatedItems = cartItems.filter(
                    (i: any) => i.idx !== item.idx
                  );
                  onUpdateCart(updatedItems);
                }}
                className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center"
              >
                <TrashIcon className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-lg font-bold p-4">주소 입력</h2>
      <div className="px-4">
        <input
          type="text"
          placeholder="예: 서울특별시 서초구 반포대로 1길 23 456호"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          className="w-full border rounded-md p-2"
        />
      </div>
      <h2 className="text-lg font-bold p-4">연락처 입력</h2>
      <div className="px-4">
        <input
          type="text"
          placeholder="예: 010-1234-5678"
          value={userContact}
          onChange={(e) => setUserContact(e.target.value)}
          className="w-full border rounded-md p-2"
        />
      </div>
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span className="font-bold">₩{totalPrice.toLocaleString()}</span>
          <button
            onClick={() => {
              if (!userAddress || !userContact) {
                alert("주소 및 연락처를 입력해주세요.");
                return;
              }
              setShowModal(true);
            }}
            className="bg-white text-sky-400 px-6 py-2 rounded-full font-semibold shadow-lg hover:bg-sky-100 transition"
          >
            결제하기
          </button>
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-sm overflow-hidden">
                <div className="px-6 py-4">
                  <h2 className="text-base font-medium text-gray-800">
                    주소와 연락처가 확실한가요?
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium text-gray-700">주소:</span>{" "}
                    {userAddress}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium text-gray-700">연락처:</span>{" "}
                    {userContact}
                  </p>
                </div>
                <div className="flex border-t border-gray-200">
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-1/2 text-sm text-gray-500 py-3 hover:bg-gray-100 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handlePayment();
                    }}
                    className="w-1/2 text-sm text-sky-500 py-3 font-medium hover:bg-sky-50 transition"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
