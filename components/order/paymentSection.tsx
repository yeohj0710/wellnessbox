"use client";

import Image from "next/image";
import NextBestActionCard from "@/components/common/NextBestActionCard";
import OfferIntelligenceCard from "@/components/common/OfferIntelligenceCard";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import PurchaseRetentionCard from "@/components/order/PurchaseRetentionCard";
import type {
  OfferAction,
  OfferCardModel,
} from "@/lib/offer-intelligence/engine";
import { usePaymentSectionState } from "./hooks/usePaymentSectionState";

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
  customTestAmount,
  setCustomTestAmount,
  isUserLoggedIn,
  roadAddress,
  phoneStatusLoading,
  phone,
  isPhoneLinked,
  password,
  itemCount,
  hasDeliveryContext,
  checkoutOffer,
  onCheckoutOfferAction,
  onOpenAddressModal,
  onOpenPhoneModal,
  onRequestPayment,
}: PaymentSectionProps) {
  const {
    isCheckoutReady,
    checkoutConfidence,
    nextBestAction,
    ctaLabel,
    checklist,
    handlePrimaryAction,
    handleNextBestPrimaryAction,
  } = usePaymentSectionState({
    selectedPaymentMethod,
    totalPrice,
    totalPriceWithDelivery,
    isUserLoggedIn,
    roadAddress,
    phoneStatusLoading,
    phone,
    isPhoneLinked,
    password,
    itemCount,
    hasDeliveryContext,
    onOpenAddressModal,
    onOpenPhoneModal,
    onRequestPayment,
  });

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

      {totalPrice > 0 ? (
        <div className="mt-6 px-4">
          {nextBestAction ? (
            <NextBestActionCard
              action={nextBestAction}
              onPrimaryAction={
                nextBestAction.actionKey ? handleNextBestPrimaryAction : null
              }
              hidePrimaryButton={!nextBestAction.actionKey}
              className="mb-4"
            />
          ) : null}

          <OfferIntelligenceCard
            offer={checkoutOffer}
            onAction={onCheckoutOfferAction}
            className="mb-4"
          />

          <PurchaseRetentionCard model={checkoutConfidence} className="mb-4" />

          <div className="rounded-2xl bg-gray-50 px-4 py-4 ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">주문 전 확인</p>
                <p className="mt-1 text-xs text-gray-500">
                  결제 전에 막히는 부분을 먼저 정리해드릴게요.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isCheckoutReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isCheckoutReady ? "결제 준비 완료" : "입력 필요"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-gray-100"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{item.helper}</p>
                  </div>
                  <div className="shrink-0">
                    {item.ready ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        완료
                      </span>
                    ) : item.onAction ? (
                      <button
                        type="button"
                        onClick={item.onAction}
                        className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-200"
                      >
                        {item.actionLabel}
                      </button>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        확인 필요
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-gray-600 ring-1 ring-gray-100">
              결제 후에는 약사 검토가 끝나면 조제가 진행돼요. 입력한 전화번호와
              비밀번호로 주문 상태를 다시 확인할 수 있어요.
            </div>
          </div>

          {loginStatus.isTestLoggedIn && selectedPaymentMethod === "inicis" ? (
            <div className="mb-6 mt-6 px-4 py-2">
              <label className="text-sm font-medium text-gray-700">
                테스트 결제 금액(원)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={customTestAmount}
                onChange={(event) => setCustomTestAmount(Number(event.target.value))}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {!isUserLoggedIn ? (
              <KakaoLoginButton fullWidth className="justify-center py-3" />
            ) : null}

            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={totalPrice <= 0 || phoneStatusLoading}
              className="w-full rounded-lg bg-sky-400 py-3 font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      ) : null}

      {totalPrice <= 0 ? (
        <div className="fixed bottom-0 left-0 right-0 mx-auto flex w-full max-w-[640px] items-center justify-between bg-gray-400 p-4 text-lg font-bold text-white">
          <span>{totalPrice.toLocaleString()}원</span>
          <span className="py-3 text-sm text-white">
            상품을 1개 이상 담으면 주문을 진행할 수 있어요.
          </span>
        </div>
      ) : null}
    </>
  );
}
