"use client";

import { useEffect } from "react";
import {
  CHAT_PAGE_ACTION_EVENT,
  type ChatPageActionDetail,
} from "@/lib/chat/page-action-events";

function scrollToById(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function MyDataPageActionBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPageAction = (event: Event) => {
      const detail = (event as CustomEvent<ChatPageActionDetail>).detail;
      if (!detail) return;

      if (detail.action === "focus_my_data_account") {
        scrollToById("my-data-account");
        return;
      }

      if (detail.action === "focus_my_data_orders") {
        scrollToById("my-data-orders");
      }
    };

    window.addEventListener(CHAT_PAGE_ACTION_EVENT, onPageAction as EventListener);
    return () => {
      window.removeEventListener(
        CHAT_PAGE_ACTION_EVENT,
        onPageAction as EventListener
      );
    };
  }, []);

  return null;
}
