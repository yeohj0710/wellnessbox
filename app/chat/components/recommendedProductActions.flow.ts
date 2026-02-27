import type { Dispatch, SetStateAction } from "react";
import type { ActionableRecommendation } from "./recommendedProductActions.types";
import { hasSavedRoadAddress, updateCartItems } from "./recommendedProductActions.cart";

export type PendingCartAction = {
  items: ActionableRecommendation[];
  openCartAfterSave: boolean;
  successFeedback?: string;
};

type RunCartActionWithAddressGuardInput = {
  targets: ActionableRecommendation[];
  options?: {
    openCartAfterSave?: boolean;
    successFeedback?: string;
  };
  setPendingCartAction: Dispatch<SetStateAction<PendingCartAction | null>>;
  setShowAddressGuideModal: Dispatch<SetStateAction<boolean>>;
  setFeedback: Dispatch<SetStateAction<string>>;
};

function openCartPanel() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("wbGlobalCartOpen", "1");
  localStorage.setItem("openCart", "true");
  window.dispatchEvent(new Event("openCart"));
}

export function runCartActionWithAddressGuard({
  targets,
  options,
  setPendingCartAction,
  setShowAddressGuideModal,
  setFeedback,
}: RunCartActionWithAddressGuardInput) {
  if (!targets.length) return;

  const openCartAfterSave = options?.openCartAfterSave === true;
  if (!hasSavedRoadAddress()) {
    setPendingCartAction({
      items: targets,
      openCartAfterSave,
      successFeedback: options?.successFeedback,
    });
    setShowAddressGuideModal(true);
    return;
  }

  updateCartItems(targets);
  if (openCartAfterSave) {
    openCartPanel();
    return;
  }

  if (options?.successFeedback) {
    setFeedback(options.successFeedback);
  }
}

type ApplyPendingCartActionAfterAddressSaveInput = {
  pending: PendingCartAction | null;
};

export function applyPendingCartActionAfterAddressSave({
  pending,
}: ApplyPendingCartActionAfterAddressSaveInput) {
  if (!pending || pending.items.length === 0) return false;

  updateCartItems(pending.items);
  if (pending.openCartAfterSave) {
    openCartPanel();
    return true;
  }
  return false;
}
