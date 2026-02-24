"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

export function useProductDetailDismissGuards(input: {
  onClose: () => void;
  imageCount: number;
  selectedImageRef: MutableRefObject<string | null>;
  setSelectedImage: Dispatch<SetStateAction<string | null>>;
  firstModalRef: MutableRefObject<boolean>;
  setIsFirstModalOpen: Dispatch<SetStateAction<boolean>>;
  setCurrentIdx: Dispatch<SetStateAction<number>>;
}) {
  const {
    onClose,
    imageCount,
    selectedImageRef,
    setSelectedImage,
    firstModalRef,
    setIsFirstModalOpen,
    setCurrentIdx,
  } = input;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedImageRef.current) {
          setSelectedImage(null);
          return;
        }
        if (firstModalRef.current) {
          setIsFirstModalOpen(false);
          return;
        }
        onClose();
      }
      if (event.key === "ArrowLeft") {
        setCurrentIdx((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        setCurrentIdx((current) => Math.min(imageCount - 1, current + 1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const handlePopState = () => {
      if (selectedImageRef.current) {
        setSelectedImage(null);
        window.history.pushState(null, "", window.location.href);
        return;
      }
      if (firstModalRef.current) {
        setIsFirstModalOpen(false);
        window.history.pushState(null, "", window.location.href);
        return;
      }
      onClose();
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
  }, [
    firstModalRef,
    imageCount,
    onClose,
    selectedImageRef,
    setCurrentIdx,
    setIsFirstModalOpen,
    setSelectedImage,
  ]);
}
