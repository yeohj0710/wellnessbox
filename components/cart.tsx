"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { TrashIcon } from "@heroicons/react/16/solid";

export default function Cart({ cartItems, onBack, onUpdateCart }: any) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [userContact, setUserContact] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
  const [showModal, setShowModal] = useState(false);
  const totalPrice = cartItems.reduce(
    (acc: any, item: any) => acc + item.price * item.quantity,
    0
  );
  const handlePaymentRequest = async (
    payMethod: string,
    channelKey: string
  ) => {
    const PortOne: any = await import("@portone/browser-sdk/v2");
    try {
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        paymentId: `payment${Date.now()}`,
        orderName: "웰니스박스 건강기능식품",
        totalAmount: totalPrice,
        currency: "KRW",
        channelKey,
        payMethod,
        customer: {
          customerId: "customer_1234",
          fullName: "user",
          email: "buyer@example.com",
          phoneNumber: userContact,
        },
      });
      if (!response.txId || response.transactionType !== "PAYMENT") {
        alert("결제에 실패하였습니다. 결제 상태를 확인해주세요.");
        return;
      }
      alert("결제가 완료되었습니다.");
      const queryString = new URLSearchParams({
        userAddress,
        userContact,
        totalPrice: totalPrice.toString(),
        cartItems: encodeURIComponent(JSON.stringify(cartItems)),
      }).toString();
      window.location.href = "/order-complete?" + queryString;
    } catch (error) {
      console.error("결제 요청 중 오류 발생:", error);
      alert(
        `결제 요청 중 오류가 발생했습니다. 상세 정보: ${JSON.stringify(error)}`
      );
    }
  };
  const handlePayment = async () => {
    if (!sdkLoaded || !window.IMP) {
      alert("포트원 SDK 로드 실패");
      return;
    }
    if (!userAddress || !userContact) {
      alert("주소와 연락처를 입력해주세요.");
      return;
    }

    const IMP = window.IMP;
    if (selectedPaymentMethod === "card") {
      await handlePaymentRequest(
        "CARD",
        process.env.NEXT_PUBLIC_PORTONE_CARD_CHANNEL_KEY!
      );
    } else if (selectedPaymentMethod === "kakao") {
      await handlePaymentRequest(
        "EASY_PAY",
        process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY!
      );
    } else if (selectedPaymentMethod === "toss") {
      IMP.init(process.env.NEXT_PUBLIC_MERCHANT_ID!);
      IMP.request_pay(
        {
          pg: "uplus",
          pay_method: "card",
          merchant_uid: `mid_${new Date().getTime()}`,
          name: "웰니스박스 건강기능식품",
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
    }
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
      <div className="space-y-4 px-4 mb-2">
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
      <h2 className="text-lg font-bold p-4 pb-2">주소 입력</h2>
      <div className="px-4">
        <input
          type="text"
          placeholder="예: 서울특별시 서초구 반포대로 1길 23 456호"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          className="w-full border rounded-md p-2 mb-2"
        />
      </div>
      <h2 className="text-lg font-bold p-4 pb-2">연락처 입력</h2>
      <div className="px-4">
        <input
          type="text"
          placeholder="예: 010-1234-5678"
          value={userContact}
          onChange={(e) => setUserContact(e.target.value)}
          className="w-full border rounded-md p-2"
        />
      </div>
      <h2 className="text-lg font-bold p-4 mt-2">결제 방법</h2>
      <div className="px-4 space-y-3 mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            className="w-5 h-5 text-sky-500 border-gray-300"
            onChange={() => setSelectedPaymentMethod("card")}
          />
          <span className="text-base font-medium text-gray-700">
            신용/체크카드
          </span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="kakao"
            className="w-5 h-5 text-sky-500 border-gray-300"
            onChange={() => setSelectedPaymentMethod("kakao")}
          />
          <img
            src="/kakaopay.svg"
            alt="카카오페이 아이콘"
            className="w-12 h-6 ml-2.5"
          />
          <span className="text-base font-medium text-gray-700 ml-1.5">
            카카오페이
          </span>
        </label>
        {/* <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="toss"
            className="w-5 h-5 text-sky-500 border-gray-300"
            onChange={() => setSelectedPaymentMethod("toss")}
          />
          <span className="text-base font-medium text-gray-700">토스페이</span>
        </label> */}
      </div>
      {totalPrice > 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto ${
            totalPrice < 15000 ? "bg-gray-400" : "bg-sky-400"
          } text-white p-4 flex justify-between items-center text-lg font-bold`}
        >
          <span className="font-bold">₩{totalPrice.toLocaleString()}</span>
          {totalPrice < 15000 ? (
            <span className="text-sm text-white py-3">
              {`${(
                15000 - totalPrice
              ).toLocaleString()}원만 더 담으면 주문할 수 있어요.`}
            </span>
          ) : (
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
          )}
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
