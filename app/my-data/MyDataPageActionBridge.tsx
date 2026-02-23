"use client";

import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";

function scrollToById(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function MyDataPageActionBridge() {
  useChatPageActionListener((detail) => {
    if (detail.action === "focus_my_data_account") {
      scrollToById("my-data-account");
      return;
    }

    if (detail.action === "focus_my_data_orders") {
      scrollToById("my-data-orders");
    }
  });

  return null;
}
