"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { TrashIcon } from "@heroicons/react/16/solid";
import { createOrder } from "@/lib/order";
import { ExpandableSection } from "./expandableSection";

export default function Cart({
  cartItems,
  selectedPharmacy,
  onBack,
  onUpdateCart,
}: any) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [roadAddress, setRoadAddress] = useState(
    localStorage.getItem("roadAddress") || ""
  );
  const [detailAddress, setDetailAddress] = useState(
    localStorage.getItem("detailAddress") || ""
  );
  const [requestNotes, setRequestNotes] = useState("");
  const [entrancePassword, setEntrancePassword] = useState("");
  const [directions, setDirections] = useState("");
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [userContact, setUserContact] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  useEffect(() => {
    setUserContact(`${phonePart1}-${phonePart2}-${phonePart3}`);
  }, [phonePart1, phonePart2, phonePart3]);
  const totalPrice = cartItems.reduce(
    (acc: any, item: any) => acc + item.price * item.quantity,
    0
  );
  const shippingFee = 3000;
  const totalPriceWithShipping = totalPrice + shippingFee;
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
        redirectUrl: `${window.location.origin}/order-complete`,
      });
      if (response.code === "FAILURE_TYPE_PG") {
        alert(`결제가 취소되었습니다.`);
        return;
      }
      if (!response.txId || response.transactionType !== "PAYMENT") {
        alert("결제에 실패하였습니다. 결제 상태를 확인해주세요.");
        return;
      }
      await createOrder({
        roadAddress,
        detailAddress,
        phone: userContact,
        requestNotes,
        entrancePassword,
        directions,
      });
      alert("결제가 완료되었습니다.");
      window.location.href = "/order-complete";
    } catch (error) {
      console.error("결제 요청 중 오류 발생:", error);
      alert(
        `결제 요청 중 오류가 발생했습니다. 상세 정보: ${JSON.stringify(error)}`
      );
    }
  };
  const handlePayment = async () => {
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
    }
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    const storedRoadAddress = localStorage.getItem("roadAddress");
    const storedDetailAddress = localStorage.getItem("detailAddress");
    if (storedRoadAddress) {
      setRoadAddress(storedRoadAddress);
    }
    if (storedDetailAddress) {
      setDetailAddress(storedDetailAddress);
    }
    if (window.IMP) {
      setSdkLoaded(true);
    }
  }, []);
  return (
    <div className="w-full mt-16 mb-8 max-w-[640px] mx-auto bg-white min-h-[100vh]">
      <Script
        src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
        onLoad={() => {
          setSdkLoaded(true);
        }}
        strategy="afterInteractive"
      />
      <div className="z-10 fixed top-14 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 h-12 sm:h-14 flex items-center px-4 mb-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-white text-xl mr-4 font-bold hover:scale-110"
        >
          ←
        </button>
        <h1 className="sm:text-lg font-bold text-white">장바구니</h1>
      </div>
      <div className="px-4 sm:mt-2">
        <h2 className="text-lg font-bold pb-4 border-b mb-4">선택한 상품</h2>
      </div>
      <div className="space-y-4 px-4 mb-2">
        {cartItems.length > 0 ? (
          cartItems.map((item: any) => (
            <div
              key={item.idx}
              className="flex items-center gap-4 border-b pb-4"
            >
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
                <p className="text-sm text-gray-500">
                  {item.categories
                    ?.map((category: any) => category.name)
                    .join(", ") || "카테고리 없음"}
                </p>
                <p className="font-bold text-lg text-sky-500">
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
                    localStorage.setItem(
                      "cartItems",
                      JSON.stringify(updatedItems)
                    );
                  }}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-lg"
                >
                  -
                </button>
                <span className="font-bold">{item.quantity}</span>
                <button
                  onClick={() => {
                    const updatedItems = cartItems.map((i: any) =>
                      i.idx === item.idx
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                    );
                    onUpdateCart(updatedItems);
                    localStorage.setItem(
                      "cartItems",
                      JSON.stringify(updatedItems)
                    );
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
                    localStorage.setItem(
                      "cartItems",
                      JSON.stringify(updatedItems)
                    );
                  }}
                  className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center"
                >
                  <TrashIcon className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center h-28">
            <p className="text-gray-500 font-medium">장바구니가 텅 비었어요.</p>
          </div>
        )}
      </div>
      <h2 className="text-lg font-bold p-4 pb-2">주소 입력</h2>
      <div className="px-4 space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            도로명 주소
          </label>
          <p className="text-base text-gray-500 bg-gray-100 px-2.5 py-2 rounded-md border">
            {roadAddress || "저장된 도로명 주소가 없습니다."}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            상세 주소 (선택)
          </label>
          <input
            type="text"
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            placeholder="예: A동 101호"
            className="w-full border rounded-md px-3 py-2 text-base transition-colors text-gray-700"
          />
        </div>
      </div>
      <h2 className="text-lg font-bold p-4 pb-2 mt-2">추가 요청사항</h2>
      <div className="px-4 space-y-3">
        <ExpandableSection title="배송 시 요청사항 (선택)">
          <input
            type="text"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            placeholder="예: 문 앞에 놓아주세요."
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </ExpandableSection>
        <ExpandableSection title="공동현관 비밀번호 (선택)">
          <input
            type="text"
            value={entrancePassword}
            onChange={(e) => setEntrancePassword(e.target.value)}
            placeholder="예: #1234"
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </ExpandableSection>
        <ExpandableSection title="찾아오는 길 안내 (선택)">
          <input
            type="text"
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            placeholder="예: 마트 옆에 건물 입구가 있어요."
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </ExpandableSection>
      </div>
      <h2 className="text-lg font-bold p-4 pb-2 mt-3">연락처 입력</h2>
      <div className="px-4 flex gap-2 items-center">
        <input
          type="text"
          maxLength={3}
          value={phonePart1}
          onChange={(e) => setPhonePart1(e.target.value.replace(/\D/g, ""))}
          onInput={(e) => {
            const input = e.target as HTMLInputElement;
            if (input.value.length === 3) {
              input.classList.add("bg-gray-100", "text-gray-500");
            } else {
              input.classList.remove("bg-gray-100", "text-gray-500");
            }
          }}
          className={`w-14 border rounded-md px-2 py-1.5 text-center transition-colors ${
            phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
          }`}
        />
        <span className="text-gray-500">-</span>
        <input
          type="text"
          maxLength={4}
          value={phonePart2}
          onChange={(e) => setPhonePart2(e.target.value.replace(/\D/g, ""))}
          onInput={(e) => {
            if ((e.target as HTMLInputElement).value.length === 4) {
              (e.target as HTMLInputElement).classList.add(
                "bg-gray-100",
                "text-gray-500"
              );
            } else {
              (e.target as HTMLInputElement).classList.remove(
                "bg-gray-100",
                "text-gray-500"
              );
            }
          }}
          className="w-20 border rounded-md px-2 py-1.5 text-center transition-colors"
        />
        <span className="text-gray-500">-</span>
        <input
          type="text"
          maxLength={4}
          value={phonePart3}
          onChange={(e) => setPhonePart3(e.target.value.replace(/\D/g, ""))}
          onInput={(e) => {
            if ((e.target as HTMLInputElement).value.length === 4) {
              (e.target as HTMLInputElement).classList.add(
                "bg-gray-100",
                "text-gray-500"
              );
            } else {
              (e.target as HTMLInputElement).classList.remove(
                "bg-gray-100",
                "text-gray-500"
              );
            }
          }}
          className="w-20 border rounded-md px-2 py-1.5 text-center transition-colors"
        />
      </div>
      {selectedPharmacy && (
        <div className="px-4 mt-8">
          <h2 className="text-lg font-bold border-gray-300">약국 정보</h2>
          <div className="mt-2">
            <div className="flex items-center">
              <span className="w-24 text-sm font-medium text-gray-600">
                약국명
              </span>
              <p className="flex-1 font-semibold text-gray-800">
                {selectedPharmacy.name}
              </p>
            </div>
            <div className="flex items-center mt-1">
              <span className="w-24 text-sm font-medium text-gray-600">
                약국 주소
              </span>
              <p className="flex-1 text-gray-700">{selectedPharmacy.address}</p>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-lg font-bold p-4 mt-2">결제 방법</h2>
      <div className="px-4 space-y-3">
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
      </div>
      <h2 className="text-lg font-bold p-4 mt-2">최종 금액</h2>
      <div className="px-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">상품 합계</span>
          <span className="font-bold">₩{totalPrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">배송비</span>
          <span className="font-bold">₩{shippingFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-4 mt-4">
          <span className="text-lg font-bold text-gray-900">최종 금액</span>
          <span className="text-lg font-bold text-sky-500">
            ₩{totalPriceWithShipping.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="px-4 mt-6">
        <button
          onClick={() => {
            if (!sdkLoaded || !window.IMP) {
              alert(
                "결제 모듈을 불러오는 데 실패하였습니다. 페이지를 새로고침해 주세요."
              );
              return;
            }
            const isValidPhone = /^[0-9]{3}-[0-9]{4}-[0-9]{4}$/.test(
              userContact
            );
            if (!isValidPhone) {
              alert("전화번호를 올바른 형식으로 입력해 주세요.");
              return;
            }
            if (!selectedPaymentMethod) {
              alert("결제 수단을 선택해 주세요.");
              return;
            }
            setShowModal(true);
          }}
          className="w-full bg-sky-400 text-white py-2.5 sm:py-3 rounded-lg font-bold hover:bg-sky-500 transition"
        >
          결제하기
        </button>
      </div>
    </div>
  );
}
