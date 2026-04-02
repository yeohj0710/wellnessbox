"use client";

import Image from "next/image";
import type { OfferAction, OfferCardModel } from "@/lib/offer-intelligence/engine";

type PaymentSectionProps = {
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: (method: string) => void;
  loginStatus: {
    isTestLoggedIn?: boolean;
  };
  totalPrice: number;
  deliveryFee: number;
  totalPriceWithDelivery: number;
  customTestAmount: number;
  setCustomTestAmount: (amount: number) => void;
  isUserLoggedIn: boolean;
  roadAddress: string;
  phoneStatusLoading: boolean;
  phone: string;
  isPhoneLinked: boolean;
  password: string;
  itemCount: number;
  hasDeliveryContext: boolean;
  checkoutOffer: OfferCardModel | null;
  onCheckoutOfferAction: (action: OfferAction) => void;
  onOpenAddressModal: () => void;
  onOpenPhoneModal: () => void;
  onRequestPayment: () => void;
};

export default function PaymentSection({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  loginStatus,
  totalPrice,
  deliveryFee,
  totalPriceWithDelivery,
}: PaymentSectionProps) {
  return (
    <>
      <h2 className="mt-2 p-4 pb-2 text-lg font-bold">결제 수단</h2>
      <div className="space-y-3 px-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="paymentMethod"
            value="inicis"
            className="h-5 w-5 border-gray-300 text-sky-500"
            checked={selectedPaymentMethod === "inicis"}
            onChange={() => setSelectedPaymentMethod("inicis")}
          />
          <span className="text-base font-medium text-gray-700">
            신용/체크카드
          </span>
        </label>

        {loginStatus.isTestLoggedIn ? (
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="paymentMethod"
              value="kpn"
              className="h-5 w-5 border-gray-300 text-sky-500"
              checked={selectedPaymentMethod === "kpn"}
              onChange={() => setSelectedPaymentMethod("kpn")}
            />
            <div className="flex items-center gap-1.5">
              <span className="text-base font-medium text-gray-700">NHN KCP</span>
              <div className="rounded-full bg-orange-400 px-2">
                <span className="text-xs font-bold text-white">테스트 결제</span>
              </div>
            </div>
          </label>
        ) : null}

        <label className="flex cursor-pointer items-center">
          <input
            type="radio"
            name="paymentMethod"
            value="kakao"
            className="h-5 w-5 border-gray-300 text-sky-500"
            checked={selectedPaymentMethod === "kakao"}
            onChange={() => setSelectedPaymentMethod("kakao")}
          />
          <div className="ml-2.5 flex items-center gap-1.5">
            <div className="relative h-6 w-12">
              <Image
                src="/kakaopay.svg"
                alt="카카오페이"
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
            <span className="text-base font-medium text-gray-700">
              카카오페이
            </span>
            {loginStatus.isTestLoggedIn ? (
              <div className="rounded-full bg-orange-400 px-2">
                <span className="text-xs font-bold text-white">테스트 결제</span>
              </div>
            ) : null}
          </div>
        </label>
      </div>

      {totalPrice > 0 ? (
        <>
          <h2 className="mt-2 p-4 text-lg font-bold">최종 금액</h2>
          <div className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">상품 합계</span>
              <span className="font-bold">{totalPrice.toLocaleString()}원</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">배송비</span>
              <span className="font-bold">{deliveryFee.toLocaleString()}원</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-lg font-bold text-gray-900">최종 금액</span>
              <span className="text-lg font-bold text-sky-500">
                {totalPriceWithDelivery.toLocaleString()}원
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-12">
          <span />
        </div>
      )}

      {/* Checkout helper/recovery/login blocks below final amount are intentionally hidden for now
      per the current cart UI cleanup request.
      {loginStatus.isTestLoggedIn && selectedPaymentMethod === "inicis" ? (
        <div className="mb-6 mt-6 px-4 py-2">
          <label className="text-sm font-medium text-gray-700">테스트 결제 금액</label>
          <input
            type="number"
            inputMode="numeric"
            value={customTestAmount}
            onChange={(event) => setCustomTestAmount(Number(event.target.value))}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
      ) : null} */}
    </>
  );
}
