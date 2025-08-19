"use client";

import Image from "next/image";

export default function PaymentSection({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  loginStatus,
  totalPrice,
  deliveryFee,
  totalPriceWithDelivery,
  customTestAmount,
  setCustomTestAmount,
  onRequestPayment,
}: any) {
  return (
    <>
      <h2 className="text-lg font-bold p-4 pb-2 mt-2">결제 수단</h2>
      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
        <label
          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
            selectedPaymentMethod === "inicis"
              ? "border-sky-400 bg-sky-50"
              : "border-gray-200 hover:border-sky-400"
          }`}
        >
          <input
            type="radio"
            name="payment"
            value="inicis"
            checked={selectedPaymentMethod === "inicis"}
            onChange={() => setSelectedPaymentMethod("inicis")}
            className="hidden"
          />
          <div className="w-8 h-8 relative">
            <Image
              src="/icons/card.svg"
              alt="카드 결제 아이콘"
              fill
              sizes="128px"
              className="object-contain"
            />
          </div>
          <span className="text-base font-medium text-gray-700">신용/체크카드</span>
        </label>
        {loginStatus.isTestLoggedIn && (
          <label
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
              selectedPaymentMethod === "kakaopay"
                ? "border-sky-400 bg-sky-50"
                : "border-gray-200 hover:border-sky-400"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="kakaopay"
              checked={selectedPaymentMethod === "kakaopay"}
              onChange={() => setSelectedPaymentMethod("kakaopay")}
              className="hidden"
            />
            <div className="w-8 h-8 relative">
              <Image
                src="/icons/kakaopay.svg"
                alt="카카오페이 아이콘"
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
            <span className="text-base font-medium text-gray-700">카카오페이</span>
            <div className="bg-orange-400 px-2 rounded-full">
              <span className="text-xs font-bold text-white">테스트 결제</span>
            </div>
          </label>
        )}
      </div>
      <h2 className="text-lg font-bold p-4 mt-2">최종 금액</h2>
      <div className={`px-4 ${totalPrice <= 0 ? "mb-24 pb-2" : ""}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">상품 합계</span>
          <span className="font-bold">{totalPrice.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">배송비</span>
          <span className="font-bold">{deliveryFee.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-center border-t pt-4 mt-4">
          <span className="text-lg font-bold text-gray-900">최종 금액</span>
          <span className="text-lg font-bold text-sky-500">
            {totalPriceWithDelivery.toLocaleString()}원
          </span>
        </div>
      </div>
      {totalPrice > 0 && (
        <div className="px-4 mt-6">
          {loginStatus.isTestLoggedIn && selectedPaymentMethod === "inicis" && (
            <div className="px-4 py-2 mb-6">
              <label className="text-sm font-medium text-gray-700">
                테스트 결제 금액 (원)
              </label>
              <input
                type="number"
                value={customTestAmount}
                onChange={(e) => setCustomTestAmount(Number(e.target.value))}
                className="mt-1 w-full border rounded-md px-3 py-2"
              />
            </div>
          )}
          <button
            onClick={onRequestPayment}
            className="w-full bg-sky-400 text-white py-2.5 sm:py-3 rounded-lg font-bold hover:bg-sky-500 transition"
          >
            결제하기
          </button>
        </div>
      )}
      {totalPrice <= 0 && (
        <div
          className={`px-6 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-gray-400 text-white p-4 flex justify-between items-center text-lg font-bold`}
        >
          <span className="font-bold">{totalPrice.toLocaleString()}원</span>
          <span className="text-sm text-white py-3">
            상품을 1개만 담으면 주문할 수 있어요.
          </span>
        </div>
      )}
    </>
  );
}
