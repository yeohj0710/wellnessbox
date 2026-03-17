"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import { getOrderById, getOrderStatusById } from "@/lib/order";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import {
  getLastMessageId,
  sortMessagesByCreatedAt,
} from "./customerOrderAccordion.helpers";
import { useCustomerOrderPushState } from "./useCustomerOrderPushState";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "./orderAccordion.types";

const POLL_INTERVAL_MS = 10_000;

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  );
}

export function useCustomerOrderAccordionItem(params: {
  initialOrder: OrderAccordionOrder;
  isInitiallyExpanded: boolean;
}) {
  const { initialOrder, isInitiallyExpanded } = params;
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [order, setOrder] = useState<OrderAccordionOrder>(initialOrder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
  const {
    browserSupported,
    notificationPermission,
    isSubscribed,
    isSubscriptionStatusLoading,
    isSubscribeLoading,
    toggleSubscription,
  } = useCustomerOrderPushState({
    orderId: Number(initialOrder.id),
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesSectionRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef(false);
  const lastSeenIdRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);

  const scrollToBottom = useCallback(() => {
    const element = messagesContainerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const element = messagesContainerRef.current;
    if (!element) return;
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
    isNearBottomRef.current = gap < 80;
  }, []);

  useEffect(() => {
    if (!isExpanded || isLoaded) return;

    let cancelled = false;

    async function fetchDetailsAndMessages() {
      try {
        const [detailedOrder, incomingMessages] = await Promise.all([
          getOrderById(initialOrder.id),
          getMessagesByOrder(initialOrder.id),
        ]);

        if (cancelled) return;

        if (detailedOrder) {
          setOrder((prevOrder) => ({
            ...prevOrder,
            ...(detailedOrder as Partial<OrderAccordionOrder>),
          }));
        }

        const sortedMessages = sortMessagesByCreatedAt(
          incomingMessages as OrderMessage[]
        );
        setMessages(sortedMessages);
        lastSeenIdRef.current = getLastMessageId(sortedMessages);
        setIsLoaded(true);
      } catch (error) {
        console.error(error);
      }
    }

    void fetchDetailsAndMessages();

    return () => {
      cancelled = true;
    };
  }, [initialOrder.id, isExpanded, isLoaded]);

  const refreshOrderStatus = useCallback(async () => {
    try {
      const updatedStatus = await getOrderStatusById(order.id);
      setOrder((prev) => ({
        ...prev,
        status: isOrderStatus(updatedStatus?.status)
          ? updatedStatus.status
          : prev.status,
      }));
    } catch (error) {
      console.error(error);
    }
  }, [order.id]);

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    const intervalId = setInterval(() => {
      void refreshOrderStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isExpanded, isLoaded, refreshOrderStatus]);

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;

    const tick = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const incomingMessages = await getMessagesByOrder(order.id);
        const sortedMessages = sortMessagesByCreatedAt(
          incomingMessages as OrderMessage[]
        );
        const nextLastId = getLastMessageId(sortedMessages);
        const hasNew = nextLastId > lastSeenIdRef.current;

        setMessages(sortedMessages);

        if (hasNew && isNearBottomRef.current) {
          scrollToBottom();
        }
        if (hasNew) {
          lastSeenIdRef.current = nextLastId;
        }
      } catch (error) {
        console.error(error);
      } finally {
        pollingRef.current = false;
      }
    };

    void tick();

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void tick();
    };
    const onFocus = () => {
      void tick();
    };

    window.addEventListener("visibilitychange", onVisibilityChange, {
      passive: true,
    });
    window.addEventListener("focus", onFocus, { passive: true });
    const intervalId = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [isExpanded, isLoaded, order.id, scrollToBottom]);

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    requestAnimationFrame(() => {
      const latestId = messages.length ? messages[messages.length - 1].id : 0;
      lastSeenIdRef.current = Math.max(lastSeenIdRef.current, latestId);
      scrollToBottom();
    });
  }, [isExpanded, isLoaded, messages.length, scrollToBottom]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const refreshMessages = useCallback(
    async (manual = false) => {
      if (manual) setIsMessagesRefreshing(true);
      try {
        const incomingMessages = await getMessagesByOrder(order.id);
        const sortedMessages = sortMessagesByCreatedAt(
          incomingMessages as OrderMessage[]
        );
        setMessages(sortedMessages);
        const latestId = getLastMessageId(sortedMessages);
        if (latestId > 0) {
          lastSeenIdRef.current = latestId;
        }
        scrollToBottom();
      } catch (error) {
        console.error(error);
      } finally {
        if (manual) setIsMessagesRefreshing(false);
      }
    },
    [order.id, scrollToBottom]
  );

  const focusMessageComposer = useCallback((draft?: string) => {
    if (typeof draft === "string" && draft.trim()) {
      setNewMessage(draft.trim());
    }
    messagesSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => {
      messageInputRef.current?.focus();
    }, 220);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const createdMessage = (await createMessage({
        orderId: order.id,
        content: newMessage,
      })) as OrderMessage;

      setMessages((prev) => sortMessagesByCreatedAt([...prev, createdMessage]));
      lastSeenIdRef.current = createdMessage.id || lastSeenIdRef.current;
      scrollToBottom();
      setNewMessage("");
    } catch (error) {
      console.error(error);
      alert("메시지 전송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  }, [isSending, newMessage, order.id, scrollToBottom]);

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    const confirmDelete = window.confirm("정말로 메시지를 삭제할까요?");
    if (!confirmDelete) return;

    try {
      await deleteMessage(messageId);
      setMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== messageId)
      );
    } catch (error) {
      console.error(error);
      alert("메시지 삭제에 실패했습니다.");
    }
  }, []);

  return {
    isExpanded,
    order,
    isLoaded,
    messages,
    newMessage,
    isSending,
    isMessagesRefreshing,
    browserSupported,
    notificationPermission,
    isSubscribed,
    isSubscriptionStatusLoading,
    isSubscribeLoading,
    messagesContainerRef,
    messagesSectionRef,
    messageInputRef,
    setNewMessage,
    toggleExpanded,
    refreshMessages,
    handleScroll,
    focusMessageComposer,
    sendMessage,
    handleDeleteMessage,
    toggleSubscription,
  };
}
