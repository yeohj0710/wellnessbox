"use client";

import { useEffect, useRef } from "react";
import {
  CHAT_PAGE_ACTION_EVENT,
  type ChatPageActionDetail,
} from "./page-action-events";

type OnChatPageAction = (detail: ChatPageActionDetail) => void;

export function useChatPageActionListener(onAction: OnChatPageAction) {
  const onActionRef = useRef(onAction);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePageAction = (event: Event) => {
      const detail = (event as CustomEvent<ChatPageActionDetail>).detail;
      if (!detail) return;
      onActionRef.current(detail);
    };

    window.addEventListener(
      CHAT_PAGE_ACTION_EVENT,
      handlePageAction as EventListener
    );
    return () => {
      window.removeEventListener(
        CHAT_PAGE_ACTION_EVENT,
        handlePageAction as EventListener
      );
    };
  }, []);
}

