"use client";

import { useCallback, useEffect } from "react";

import { useLinkedPhoneStatus } from "./useLinkedPhoneStatus";
import { useManualLookupForm } from "./useManualLookupForm";
import { useOrderViewState } from "./useOrderViewState";

export function useMyOrdersController() {
  const linkedPhone = useLinkedPhoneStatus();

  const orderView = useOrderViewState({
    isPhoneLinked: linkedPhone.isPhoneLinked,
    phoneStatusLoading: linkedPhone.phoneStatusLoading,
    linkedPhoneNormalized: linkedPhone.linkedPhoneNormalized,
  });

  const manualLookup = useManualLookupForm({
    onLookupSuccess: (config) => {
      orderView.viewManualOrders(config);
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!linkedPhone.phoneStatusLoading && !linkedPhone.phoneStatusError) {
      orderView.resetDismissedLinkedView();
    }
  }, [
    linkedPhone.phoneStatusError,
    linkedPhone.phoneStatusLoading,
    orderView.resetDismissedLinkedView,
  ]);

  const openVerifyModal = useCallback(() => {
    manualLookup.clearError();
    linkedPhone.openVerifyModal();
  }, [linkedPhone, manualLookup]);

  const handleLinkedLookup = useCallback(() => {
    manualLookup.clearError();
    orderView.viewLinkedOrders();
  }, [manualLookup, orderView]);

  const handleLinkedFromModal = useCallback(
    (nextPhone: string, nextLinkedAt?: string) => {
      linkedPhone.handleLinkedFromModal(nextPhone, nextLinkedAt);
    },
    [linkedPhone]
  );

  const handleLinkedWithDetails = useCallback(
    (nextPhone: string, nextLinkedAt?: string) => {
      linkedPhone.handleLinkedFromModal(nextPhone, nextLinkedAt);
      orderView.viewLinkedOrdersWithPhone(nextPhone);
    },
    [linkedPhone, orderView]
  );

  const handleUnlinkFromDetails = useCallback(async () => {
    await linkedPhone.handleUnlinkPhone();
    orderView.handleBackFromDetails();
  }, [linkedPhone, orderView]);

  const handleOtherNumberFromDetails = useCallback(() => {
    manualLookup.clearError();
    orderView.handleOtherNumberFromDetails();
  }, [manualLookup, orderView]);

  return {
    viewConfig: orderView.isViewingDetails,
    manualLookup,
    linkedState: {
      isPhoneLinked: linkedPhone.isPhoneLinked,
      phoneStatusLoading: linkedPhone.phoneStatusLoading,
      phoneStatusError: linkedPhone.phoneStatusError,
      linkedPhoneDisplay: linkedPhone.linkedPhoneDisplay,
      linkedPhone: linkedPhone.linkedPhone,
      linkedAt: linkedPhone.linkedAt,
      isVerifyOpen: linkedPhone.isVerifyOpen,
      unlinkLoading: linkedPhone.unlinkLoading,
      unlinkError: linkedPhone.unlinkError,
    },
    actions: {
      openVerifyModal,
      closeVerifyModal: linkedPhone.closeVerifyModal,
      handleLinkedLookup,
      handleLinkedFromModal,
      handleLinkedWithDetails,
      handleUnlinkPhone: linkedPhone.handleUnlinkPhone,
      handleUnlinkFromDetails,
      handleOtherNumberFromDetails,
      handleBackFromDetails: orderView.handleBackFromDetails,
      dismissLinkedView: orderView.dismissLinkedView,
    },
  };
}
