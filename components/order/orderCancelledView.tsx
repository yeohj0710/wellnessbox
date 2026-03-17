"use client";

import { useEffect, useMemo } from "react";
import CartRecoveryCoachCard from "./CartRecoveryCoachCard";
import PurchaseRetentionCard from "./PurchaseRetentionCard";
import {
  buildCartRecoveryModel,
  persistCheckoutRecoveryState,
  persistPendingCartRecoveryAction,
  type CartRecoveryAction,
} from "@/lib/order/cart-recovery";
import {
  buildPaymentRecovery,
  resolveAlternatePaymentMethod,
} from "@/lib/order/purchase-retention";

function readStoredCartSummary() {
  if (typeof window === "undefined") {
    return { itemCount: 0, totalPrice: 0, hasLongPackage: false };
  }

  try {
    const raw = localStorage.getItem("cartBackup");
    if (!raw) {
      return { itemCount: 0, totalPrice: 0, hasLongPackage: false };
    }

    const items = JSON.parse(raw) as Array<{
      quantity?: number | string | null;
      count?: number | string | null;
      price?: number | string | null;
      optionType?: string | null;
    }>;

    const itemCount = Array.isArray(items) ? items.length : 0;
    const totalPrice = Array.isArray(items)
      ? items.reduce((sum, item) => {
          const quantity = Number(item.quantity ?? item.count ?? 1);
          const price = Number(item.price ?? 0);
          return (
            sum +
            (Number.isFinite(quantity) ? quantity : 1) *
              (Number.isFinite(price) ? price : 0)
          );
        }, 0)
      : 0;
    const hasLongPackage = Array.isArray(items)
      ? items.some((item) => /(30|정기|구독)/.test(String(item.optionType || "")))
      : false;

    return { itemCount, totalPrice, hasLongPackage };
  } catch {
    return { itemCount: 0, totalPrice: 0, hasLongPackage: false };
  }
}

export default function OrderCancelledView({
  onReturn,
}: {
  onReturn: () => void;
}) {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const paymentMethod =
    (typeof window !== "undefined" && localStorage.getItem("paymentMethod")) ||
    params?.get("method") ||
    null;
  const cartSummary = readStoredCartSummary();
  const cancelledByUser =
    params?.get("cancelled") === "true" || params?.get("imp_success") === "false";
  const failureCode = params?.get("code") || null;
  const hasRoadAddress =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("roadAddress")?.trim());
  const hasPhone =
    typeof window !== "undefined" &&
    Boolean(
      `${localStorage.getItem("phonePart1") || ""}${
        localStorage.getItem("phonePart2") || ""
      }${localStorage.getItem("phonePart3") || ""}`.trim()
    );
  const hasPassword =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("password")?.trim());

  const recovery = useMemo(
    () =>
      buildPaymentRecovery({
        paymentMethod,
        cancelledByUser,
        failureCode,
        itemCount: cartSummary.itemCount,
        totalPrice: cartSummary.totalPrice,
        hasRoadAddress,
        hasPhone,
      }),
    [
      cancelledByUser,
      cartSummary.itemCount,
      cartSummary.totalPrice,
      failureCode,
      hasPhone,
      hasRoadAddress,
      paymentMethod,
    ]
  );

  const recoveryCoach = useMemo(
    () =>
      buildCartRecoveryModel({
        surface: "payment-failed",
        itemCount: cartSummary.itemCount,
        totalPrice: cartSummary.totalPrice,
        cartUpdatedAt: null,
        selectedPaymentMethod: paymentMethod,
        hasRoadAddress,
        needsPhoneVerification: !hasPhone,
        hasPassword,
        hasLongPackage: cartSummary.hasLongPackage,
        recoveryState: {
          at: Date.now(),
          paymentMethod,
          failureCode,
          cancelledByUser,
        },
      }),
    [
      cancelledByUser,
      cartSummary.hasLongPackage,
      cartSummary.itemCount,
      cartSummary.totalPrice,
      failureCode,
      hasPassword,
      hasPhone,
      hasRoadAddress,
      paymentMethod,
    ]
  );

  const alternatePayment = resolveAlternatePaymentMethod(paymentMethod);

  useEffect(() => {
    if (typeof window === "undefined") return;

    persistCheckoutRecoveryState({
      at: Date.now(),
      paymentMethod,
      failureCode,
      cancelledByUser,
    });
  }, [cancelledByUser, failureCode, paymentMethod]);

  const handleRetryWithAlternateMethod = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredPaymentMethod", alternatePayment.method);
    }
    onReturn();
  };

  const handleRecoveryCoachAction = (action: CartRecoveryAction) => {
    if (typeof window === "undefined") return;

    if (action.kind === "chat" || action.kind === "explore_trial") {
      window.location.href = action.href;
      return;
    }

    if (action.kind === "alternate_payment") {
      localStorage.setItem("preferredPaymentMethod", action.paymentMethod);
      onReturn();
      return;
    }

    if (
      action.kind === "open_address" ||
      action.kind === "open_phone" ||
      action.kind === "focus_password"
    ) {
      persistPendingCartRecoveryAction(action.kind);
      onReturn();
      return;
    }

    onReturn();
  };

  return (
    <div className="mx-auto w-full max-w-[640px] px-3">
      <h1 className="mb-6 mt-12 text-center text-2xl font-bold text-gray-800">
        결제가 아직 완료되지 않았어요
      </h1>

      {recoveryCoach ? (
        <CartRecoveryCoachCard
          model={recoveryCoach}
          onAction={handleRecoveryCoachAction}
          className="mb-4"
        />
      ) : null}

      <PurchaseRetentionCard
        model={recovery}
        primaryActionLabel="같은 구성 다시 보기"
        onPrimaryAction={onReturn}
        secondaryActionLabel={alternatePayment.label}
        onSecondaryAction={handleRetryWithAlternateMethod}
      />

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600 shadow-sm">
        지금은 결제 자체를 다시 밀기보다, 막힌 이유를 한 번만 줄여서 더 쉬운
        다음 행동으로 이어가는 편이 좋아요.
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onReturn}
          className="mb-12 rounded-lg bg-sky-400 px-6 py-2 font-bold text-white transition hover:bg-sky-500"
        >
          장바구니로 돌아가기
        </button>
      </div>
    </div>
  );
}
