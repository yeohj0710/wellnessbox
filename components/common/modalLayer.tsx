"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalLayerProps = {
  open?: boolean;
  children: ReactNode;
  className?: string;
};

const DEFAULT_LAYER_CLASS_NAME = "fixed inset-0 z-[220]";
const MODAL_OPEN_ATTR = "data-wb-modal-open";

let activeModalLayerCount = 0;
let previousBodyOverflow = "";
let previousBodyTouchAction = "";
let previousRootOverflow = "";
let previousRootOverscrollBehavior = "";

function applyModalDocumentState() {
  if (typeof document === "undefined") return;
  const { body, documentElement } = document;

  previousBodyOverflow = body.style.overflow;
  previousBodyTouchAction = body.style.touchAction;
  previousRootOverflow = documentElement.style.overflow;
  previousRootOverscrollBehavior = documentElement.style.overscrollBehavior;

  body.style.overflow = "hidden";
  body.style.touchAction = "none";
  documentElement.style.overflow = "hidden";
  documentElement.style.overscrollBehavior = "none";
  body.setAttribute(MODAL_OPEN_ATTR, "true");
  documentElement.setAttribute(MODAL_OPEN_ATTR, "true");
}

function restoreModalDocumentState() {
  if (typeof document === "undefined") return;
  const { body, documentElement } = document;

  body.style.overflow = previousBodyOverflow;
  body.style.touchAction = previousBodyTouchAction;
  documentElement.style.overflow = previousRootOverflow;
  documentElement.style.overscrollBehavior = previousRootOverscrollBehavior;
  body.removeAttribute(MODAL_OPEN_ATTR);
  documentElement.removeAttribute(MODAL_OPEN_ATTR);
}

function acquireModalLayer() {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  activeModalLayerCount += 1;
  if (activeModalLayerCount === 1) {
    applyModalDocumentState();
  }

  return () => {
    activeModalLayerCount = Math.max(0, activeModalLayerCount - 1);
    if (activeModalLayerCount === 0) {
      restoreModalDocumentState();
    }
  };
}

export default function ModalLayer({
  open = true,
  children,
  className = DEFAULT_LAYER_CLASS_NAME,
}: ModalLayerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return acquireModalLayer();
  }, [open]);

  if (!open || !isMounted) return null;

  return createPortal(<div className={className}>{children}</div>, document.body);
}
