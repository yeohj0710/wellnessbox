"use client";

import { useCallback, useMemo } from "react";
import { useNextBestAction } from "@/components/common/useNextBestAction";
import { buildCheckoutConfidence } from "@/lib/order/purchase-retention";
import { focusOrderPasswordInput } from "../focusOrderPasswordInput";

type PaymentChecklistItem = {
  label: string;
  ready: boolean;
  helper: string;
  actionLabel: string;
  onAction?: () => void;
};

type UsePaymentSectionStateParams = {
  selectedPaymentMethod: string;
  totalPrice: number;
  totalPriceWithDelivery: number;
  isUserLoggedIn: boolean;
  roadAddress: string;
  phoneStatusLoading: boolean;
  phone: string;
  isPhoneLinked: boolean;
  password: string;
  itemCount: number;
  hasDeliveryContext: boolean;
  onOpenAddressModal: () => void;
  onOpenPhoneModal: () => void;
  onRequestPayment: () => void;
};

export function usePaymentSectionState({
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
}: UsePaymentSectionStateParams) {
  const hasRoadAddress = roadAddress.trim().length > 0;
  const hasPassword = password.trim().length >= 4;
  const hasPaymentMethod = selectedPaymentMethod.trim().length > 0;
  const needsPhoneVerification =
    !phoneStatusLoading && (!phone.trim() || !isPhoneLinked);
  const isCheckoutReady =
    isUserLoggedIn &&
    hasRoadAddress &&
    !phoneStatusLoading &&
    !needsPhoneVerification &&
    hasPassword &&
    hasPaymentMethod;

  const checkoutConfidence = buildCheckoutConfidence({
    totalPrice: totalPriceWithDelivery,
    itemCount,
    isUserLoggedIn,
    needsPhoneVerification,
    hasPassword,
    hasDeliveryContext,
    selectedPaymentMethod,
  });

  const { action: nextBestAction } = useNextBestAction({
    surface: "checkout",
    checkoutState: {
      isUserLoggedIn,
      hasRoadAddress,
      phoneStatusLoading,
      needsPhoneVerification,
      hasPassword,
      hasPaymentMethod,
    },
    enabled: totalPrice > 0,
  });

  const ctaLabel = !isUserLoggedIn
    ? "카카오 로그인 후 계속하기"
    : !hasRoadAddress
    ? "주소 입력 후 계속하기"
    : phoneStatusLoading
    ? "전화번호 확인 중이에요"
    : needsPhoneVerification
    ? "전화번호 인증 후 계속하기"
    : !hasPassword
    ? "주문 조회 비밀번호 입력 후 계속하기"
    : !hasPaymentMethod
    ? "결제 수단 선택 후 계속하기"
    : "결제하기";

  const handlePrimaryAction = useCallback(() => {
    if (!isUserLoggedIn) return;
    if (!hasRoadAddress) {
      onOpenAddressModal();
      return;
    }
    if (phoneStatusLoading) return;
    if (needsPhoneVerification) {
      onOpenPhoneModal();
      return;
    }
    if (!hasPassword) {
      focusOrderPasswordInput();
      return;
    }
    onRequestPayment();
  }, [
    hasPassword,
    hasRoadAddress,
    isUserLoggedIn,
    needsPhoneVerification,
    onOpenAddressModal,
    onOpenPhoneModal,
    onRequestPayment,
    phoneStatusLoading,
  ]);

  const handleNextBestPrimaryAction = useCallback(() => {
    if (!nextBestAction?.actionKey) return;

    if (nextBestAction.actionKey === "open_address") {
      onOpenAddressModal();
      return;
    }

    if (nextBestAction.actionKey === "open_phone_verification") {
      onOpenPhoneModal();
      return;
    }

    if (nextBestAction.actionKey === "focus_order_password") {
      focusOrderPasswordInput();
      return;
    }

    if (nextBestAction.actionKey === "submit_payment") {
      handlePrimaryAction();
    }
  }, [
    handlePrimaryAction,
    nextBestAction?.actionKey,
    onOpenAddressModal,
    onOpenPhoneModal,
  ]);

  const checklist = useMemo<PaymentChecklistItem[]>(
    () => [
      {
        label: "카카오 로그인",
        ready: isUserLoggedIn,
        helper: isUserLoggedIn
          ? "연동 완료"
          : "주문 접수와 주문 조회를 위해 필요해요.",
        actionLabel: "",
      },
      {
        label: "배송 주소",
        ready: hasRoadAddress,
        helper: hasRoadAddress ? "입력 완료" : "받으실 위치를 먼저 확인할게요.",
        actionLabel: hasRoadAddress ? "" : "입력",
        onAction: hasRoadAddress ? undefined : onOpenAddressModal,
      },
      {
        label: "전화번호 인증",
        ready: !needsPhoneVerification && !phoneStatusLoading,
        helper: phoneStatusLoading
          ? "확인 중"
          : !needsPhoneVerification
          ? "인증 완료"
          : "결제와 주문 조회에 쓰이는 번호예요.",
        actionLabel:
          phoneStatusLoading || (!needsPhoneVerification && !phoneStatusLoading)
            ? ""
            : "인증",
        onAction:
          phoneStatusLoading || (!needsPhoneVerification && !phoneStatusLoading)
            ? undefined
            : onOpenPhoneModal,
      },
      {
        label: "주문 조회 비밀번호",
        ready: hasPassword,
        helper: hasPassword
          ? "입력 완료"
          : "4자리 이상 입력하면 주문 상태를 다시 볼 수 있어요.",
        actionLabel: hasPassword ? "" : "입력",
        onAction: hasPassword ? undefined : focusOrderPasswordInput,
      },
    ],
    [
      hasPassword,
      hasRoadAddress,
      isUserLoggedIn,
      needsPhoneVerification,
      onOpenAddressModal,
      onOpenPhoneModal,
      phoneStatusLoading,
    ]
  );

  return {
    isCheckoutReady,
    checkoutConfidence,
    nextBestAction,
    ctaLabel,
    checklist,
    handlePrimaryAction,
    handleNextBestPrimaryAction,
  };
}
