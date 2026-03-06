"use client";

import { useEffect } from "react";

type UseCartOverlayCloseBehaviorParams = {
  onBack: () => void;
  isDetailProductOpen: boolean;
};

export function useCartOverlayCloseBehavior({
  onBack,
  isDetailProductOpen,
}: UseCartOverlayCloseBehaviorParams) {
  useEffect(() => {
    const onClose = () => onBack();
    window.addEventListener("closeCart", onClose);
    return () => window.removeEventListener("closeCart", onClose);
  }, [onBack]);

  useEffect(() => {
    if (isDetailProductOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onBack();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    const handlePopState = () => {
      onBack();
    };

    if (isMobile) {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (isMobile) {
        window.removeEventListener("popstate", handlePopState);
      }
    };
  }, [onBack, isDetailProductOpen]);
}
