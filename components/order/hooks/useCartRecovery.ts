"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  buildCartRecoveryModel,
  clearPendingCartRecoveryAction,
  readCartUpdatedAt,
  readCheckoutRecoveryState,
  readPendingCartRecoveryAction,
  type CartRecoveryAction,
  type CheckoutRecoveryState,
} from "@/lib/order/cart-recovery";
import { focusOrderPasswordInput } from "../focusOrderPasswordInput";

type UseCartRecoveryParams = {
  itemCount: number;
  totalPriceWithDelivery: number;
  roadAddress: string;
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: Dispatch<SetStateAction<string>>;
  phone: string;
  isPhoneLinked: boolean;
  phoneStatusLoading: boolean;
  password: string;
  checkoutOfferItems: { optionType: string }[];
  onBulkChange: (targetOptionType: string) => void;
  onOpenAddressModal: () => void;
  onOpenPhoneModal: () => void;
};

export function useCartRecovery({
  itemCount,
  totalPriceWithDelivery,
  roadAddress,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  phone,
  isPhoneLinked,
  phoneStatusLoading,
  password,
  checkoutOfferItems,
  onBulkChange,
  onOpenAddressModal,
  onOpenPhoneModal,
}: UseCartRecoveryParams) {
  const router = useRouter();
  const [checkoutRecoveryState, setCheckoutRecoveryState] =
    useState<CheckoutRecoveryState | null>(null);
  const [cartUpdatedAt, setCartUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCheckoutRecoveryState(readCheckoutRecoveryState(window.localStorage));
    setCartUpdatedAt(readCartUpdatedAt(window.localStorage));
  }, [itemCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pendingAction = readPendingCartRecoveryAction(window.localStorage);
    if (!pendingAction) return;

    clearPendingCartRecoveryAction(window.localStorage);

    if (pendingAction === "open_address") {
      onOpenAddressModal();
      return;
    }

    if (pendingAction === "open_phone") {
      onOpenPhoneModal();
      return;
    }

    focusOrderPasswordInput();
  }, [onOpenAddressModal, onOpenPhoneModal]);

  const needsPhoneVerification =
    !phoneStatusLoading && (!phone.trim() || !isPhoneLinked);
  const hasPassword = password.trim().length >= 4;
  const hasLongPackage = useMemo(
    () =>
      checkoutOfferItems.some((item) =>
        /(30|정기|구독)/.test(item.optionType.trim())
      ),
    [checkoutOfferItems]
  );

  const cartRecoveryModel = useMemo(
    () =>
      buildCartRecoveryModel({
        surface: "cart",
        itemCount,
        totalPrice: totalPriceWithDelivery,
        cartUpdatedAt,
        selectedPaymentMethod,
        hasRoadAddress: Boolean(roadAddress.trim()),
        needsPhoneVerification,
        hasPassword,
        hasLongPackage,
        recoveryState: checkoutRecoveryState,
      }),
    [
      cartUpdatedAt,
      checkoutRecoveryState,
      hasLongPackage,
      hasPassword,
      itemCount,
      needsPhoneVerification,
      roadAddress,
      selectedPaymentMethod,
      totalPriceWithDelivery,
    ]
  );

  const handleCartRecoveryAction = useCallback(
    (action: CartRecoveryAction) => {
      if (action.kind === "bulk_change_7") {
        onBulkChange("7일치");
        return;
      }

      if (action.kind === "chat" || action.kind === "explore_trial") {
        router.push(action.href);
        return;
      }

      if (action.kind === "alternate_payment") {
        setSelectedPaymentMethod(action.paymentMethod);
        return;
      }

      if (action.kind === "open_address") {
        onOpenAddressModal();
        return;
      }

      if (action.kind === "open_phone") {
        onOpenPhoneModal();
        return;
      }

      if (action.kind === "focus_password") {
        focusOrderPasswordInput();
      }
    },
    [
      onBulkChange,
      onOpenAddressModal,
      onOpenPhoneModal,
      router,
      setSelectedPaymentMethod,
    ]
  );

  return {
    cartRecoveryModel,
    handleCartRecoveryAction,
  };
}
