"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DrawerMenuContent } from "./menuLinks.drawer";
import { DesktopMenuContent } from "./menuLinks.desktop";
import { getMenuVisibility, type LinkPressHandlers } from "./menuLinks.shared";
import type { LoginStatus } from "@/lib/useLoginStatus";

interface MenuLinksProps {
  loginStatus: LoginStatus | null;
  onRequestLogout?: () => void;
  isLogoutPending?: boolean;
  onItemClick?: () => void;
  isDrawer?: boolean;
}

export function MenuLinks({
  loginStatus,
  onRequestLogout,
  isLogoutPending = false,
  onItemClick,
  isDrawer = false,
}: MenuLinksProps) {
  const [adminVisible, setAdminVisible] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibility = getMenuVisibility(loginStatus);

  useEffect(() => {
    if (isDrawer) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!aiRef.current) return;
      if (!aiRef.current.contains(e.target as Node)) setAiOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isDrawer]);

  useEffect(() => {
    return () => {
      if (!pressTimerRef.current) return;
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    };
  }, []);

  const handlePressEnd = useCallback(() => {
    if (!pressTimerRef.current) return;
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }, []);

  const handlePressStart = useCallback(() => {
    handlePressEnd();
    pressTimerRef.current = setTimeout(() => {
      setAdminVisible(true);
    }, 4000);
  }, [handlePressEnd]);

  const handleManagedItemClick = useCallback(() => {
    onItemClick?.();
  }, [onItemClick]);

  const pressHandlers: LinkPressHandlers = {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    onClick: handleManagedItemClick,
  };

  if (isDrawer) {
    return (
      <DrawerMenuContent
        onRequestLogout={onRequestLogout}
        isLogoutPending={isLogoutPending}
        onItemClick={onItemClick}
        pressHandlers={pressHandlers}
        visibility={visibility}
        adminVisible={adminVisible}
      />
    );
  }

  return (
    <DesktopMenuContent
      aiOpen={aiOpen}
      onToggleAiOpen={() => setAiOpen((value) => !value)}
      onCloseAiOpen={() => setAiOpen(false)}
      aiRef={aiRef}
      onRequestLogout={onRequestLogout}
      isLogoutPending={isLogoutPending}
      onItemClick={onItemClick}
      pressHandlers={pressHandlers}
      loginStatus={loginStatus}
      visibility={visibility}
      adminVisible={adminVisible}
    />
  );
}
