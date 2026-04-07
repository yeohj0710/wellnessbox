"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type CartOverlayPortalProps = {
  open?: boolean;
  children: ReactNode;
};

export default function CartOverlayPortal({
  open = true,
  children,
}: CartOverlayPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}
