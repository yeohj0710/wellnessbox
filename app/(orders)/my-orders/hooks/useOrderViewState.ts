"use client";

import { useCallback, useEffect, useState } from "react";

import { LookupConfig } from "../types";

interface UseOrderViewStateOptions {
  isPhoneLinked: boolean;
  phoneStatusLoading: boolean;
  linkedPhoneNormalized: string;
}

export function useOrderViewState({
  isPhoneLinked,
  phoneStatusLoading,
  linkedPhoneNormalized,
}: UseOrderViewStateOptions) {
  const [isViewingDetails, setIsViewingDetails] = useState<LookupConfig | null>(
    null
  );
  const [dismissedLinkedView, setDismissedLinkedView] = useState(false);

  useEffect(() => {
    if (
      isPhoneLinked &&
      !phoneStatusLoading &&
      !isViewingDetails &&
      !dismissedLinkedView
    ) {
      setIsViewingDetails({
        phone: linkedPhoneNormalized,
        password: "",
        mode: "phone-only",
      });
    }
  }, [
    dismissedLinkedView,
    isPhoneLinked,
    isViewingDetails,
    linkedPhoneNormalized,
    phoneStatusLoading,
  ]);

  const viewLinkedOrders = useCallback(() => {
    if (!isPhoneLinked || phoneStatusLoading) return;
    setDismissedLinkedView(false);
    setIsViewingDetails({
      phone: linkedPhoneNormalized,
      password: "",
      mode: "phone-only",
    });
  }, [isPhoneLinked, linkedPhoneNormalized, phoneStatusLoading]);

  const viewLinkedOrdersWithPhone = useCallback((phone: string) => {
    setDismissedLinkedView(false);
    setIsViewingDetails({
      phone: phone.replace(/\D/g, ""),
      password: "",
      mode: "phone-only",
    });
  }, []);

  const viewManualOrders = useCallback((config: LookupConfig) => {
    setIsViewingDetails(config);
  }, []);

  const handleBackFromDetails = useCallback(() => {
    setIsViewingDetails(null);
    setDismissedLinkedView(true);
  }, []);

  const handleOtherNumberFromDetails = useCallback(() => {
    setDismissedLinkedView(true);
    setIsViewingDetails(null);
  }, []);

  const dismissLinkedView = useCallback(() => {
    setDismissedLinkedView(true);
  }, []);

  const resetDismissedLinkedView = useCallback(() => {
    setDismissedLinkedView(false);
  }, []);

  return {
    isViewingDetails,
    viewLinkedOrders,
    viewLinkedOrdersWithPhone,
    viewManualOrders,
    handleBackFromDetails,
    handleOtherNumberFromDetails,
    dismissLinkedView,
    resetDismissedLinkedView,
    setIsViewingDetails,
  };
}
