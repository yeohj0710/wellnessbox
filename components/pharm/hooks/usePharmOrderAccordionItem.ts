"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrderById, getOrderStatusById } from "@/lib/order";
import { updateOrderStatus } from "@/lib/order/mutations";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import {
  getLastMessageId,
  sortMessagesByCreatedAt,
} from "@/components/order/customerOrderAccordion.helpers";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";
import {
  getPharmUser360ByOrderId,
  type PharmUser360Summary,
} from "@/lib/pharm/user-360";

const POLL_INTERVAL_MS = 10_000;

type PharmActor = {
  id: number;
} | null;

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  );
}

function isIgnorableFetchError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

function reportAsyncFetchError(scope: string, error: unknown) {
  if (isIgnorableFetchError(error)) {
    return;
  }

  console.error(`[usePharmOrderAccordionItem:${scope}]`, error);
}

export function usePharmOrderAccordionItem(params: {
  initialOrder: OrderAccordionOrder;
  isInitiallyExpanded: boolean;
  pharm: PharmActor;
}) {
  const { initialOrder, isInitiallyExpanded, pharm } = params;
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [order, setOrder] = useState<OrderAccordionOrder>(initialOrder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [user360, setUser360] = useState<PharmUser360Summary | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef(false);
  const statusPollingRef = useRef(false);
  const lastSeenIdRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        const [detailedOrder, incomingMessages, user360Summary] = await Promise.all([
          getOrderById(initialOrder.id),
          getMessagesByOrder(initialOrder.id),
          getPharmUser360ByOrderId(initialOrder.id),
        ]);

        if (cancelled) return;

        if (detailedOrder) {
          setOrder((prev) => {
            const merged = {
              ...prev,
              ...(detailedOrder as Partial<OrderAccordionOrder>),
            };
            return {
              ...merged,
              status: isOrderStatus(merged.status) ? merged.status : prev.status,
            };
          });
        }

        const sortedMessages = sortMessagesByCreatedAt(
          incomingMessages as OrderMessage[]
        );
        setMessages(sortedMessages);
        setUser360(user360Summary);
        lastSeenIdRef.current = getLastMessageId(sortedMessages);
        setIsLoaded(true);
      } catch (error) {
        reportAsyncFetchError("fetchDetailsAndMessages", error);
      }
    }

    void fetchDetailsAndMessages();

    return () => {
      cancelled = true;
    };
  }, [initialOrder.id, isExpanded, isLoaded]);

  const refreshOrderStatus = useCallback(async () => {
    if (statusPollingRef.current || !isMountedRef.current) return;

    statusPollingRef.current = true;
    try {
      const updatedStatus = await getOrderStatusById(order.id);
      if (!isMountedRef.current) return;

      setOrder((prev) => ({
        ...prev,
        status: isOrderStatus(updatedStatus?.status)
          ? updatedStatus.status
          : prev.status,
      }));
    } catch (error) {
      reportAsyncFetchError("refreshOrderStatus", error);
    } finally {
      statusPollingRef.current = false;
    }
  }, [order.id]);

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void refreshOrderStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isExpanded, isLoaded, refreshOrderStatus]);

  const refreshMessages = useCallback(
    async (manual = false) => {
      if (manual) setIsMessagesRefreshing(true);
      try {
        const incomingMessages = await getMessagesByOrder(order.id);
        if (!isMountedRef.current) return;

        const sortedMessages = sortMessagesByCreatedAt(
          incomingMessages as OrderMessage[]
        );
        setMessages(sortedMessages);
        const latestId = getLastMessageId(sortedMessages);
        if (latestId > 0) lastSeenIdRef.current = latestId;
        scrollToBottom();
      } catch (error) {
        reportAsyncFetchError("refreshMessages", error);
      } finally {
        if (manual) setIsMessagesRefreshing(false);
      }
    },
    [order.id, scrollToBottom]
  );

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;

    const tick = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        const incomingMessages = await getMessagesByOrder(order.id);
        if (!isMountedRef.current) return;

        const sortedMessages = sortMessagesByCreatedAt(
          incomingMessages as OrderMessage[]
        );
        const nextLastId = getLastMessageId(sortedMessages);
        const hasNew = nextLastId > lastSeenIdRef.current;

        setMessages(sortedMessages);
        if (hasNew && isNearBottomRef.current) scrollToBottom();
        if (hasNew) lastSeenIdRef.current = nextLastId;
      } catch (error) {
        reportAsyncFetchError("pollMessages", error);
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
      const latestId = getLastMessageId(messages);
      lastSeenIdRef.current = Math.max(lastSeenIdRef.current, latestId);
      scrollToBottom();
    });
  }, [isExpanded, isLoaded, messages, scrollToBottom]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;
    if (!pharm?.id) return;

    setIsSending(true);
    try {
      const newMessagePayload = (await createMessage({
        orderId: order.id,
        content: newMessage,
        pharmacyId: pharm.id,
      })) as OrderMessage;

      setMessages((prev) => sortMessagesByCreatedAt([...prev, newMessagePayload]));
      lastSeenIdRef.current = newMessagePayload.id || lastSeenIdRef.current;
      scrollToBottom();
      setNewMessage("");
    } catch (error) {
      console.error(error);
      alert("메시지 전송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  }, [isSending, newMessage, order.id, pharm, scrollToBottom]);

  const handleUpdateOrderStatus = useCallback(
    async (orderId: number, newStatus: OrderStatus) => {
      setLoadingStatus(orderId);
      try {
        const updatedOrder = (await updateOrderStatus(
          orderId,
          newStatus
        )) as Partial<OrderAccordionOrder> | null;

        if (!updatedOrder) return;

        setOrder((prev) => {
          const merged = {
            ...prev,
            ...updatedOrder,
          };
          return {
            ...merged,
            status: isOrderStatus(merged.status) ? merged.status : prev.status,
          };
        });
      } finally {
        setLoadingStatus(null);
      }
    },
    []
  );

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    if (!window.confirm("정말로 메시지를 삭제할까요?")) return;

    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (error) {
      console.error(error);
      alert("메시지 삭제에 실패했습니다.");
    }
  }, []);

  const sendCounselMessage = useCallback(async () => {
    if (!order?.pharmacy?.id) return;

    try {
      await createMessage({
        orderId: order.id,
        content: `안녕하세요. ${order.pharmacy.name || "약국"}입니다.`,
        pharmacyId: order.pharmacy.id,
      });

      const sentDescriptions = new Set<string>();
      for (const orderItem of order.orderItems) {
        const description = orderItem.pharmacyProduct?.product?.description;
        if (!description || sentDescriptions.has(description)) continue;
        await createMessage({
          orderId: order.id,
          content: description,
          pharmacyId: order.pharmacy.id,
        });
        sentDescriptions.add(description);
      }

      await refreshMessages();
      alert("복약지도 안내 메시지를 전송했습니다.");
    } catch (error) {
      console.error(error);
      alert("복약지도 안내 메시지 전송에 실패했습니다.");
    }
  }, [order, refreshMessages]);

  const handleCancelOrder = useCallback(() => {
    if (!window.confirm("정말로 주문을 취소할까요?")) return;
    void handleUpdateOrderStatus(order.id, ORDER_STATUS.CANCELED);
  }, [handleUpdateOrderStatus, order.id]);

  return {
    isExpanded,
    order,
    isLoaded,
    messages,
    user360,
    newMessage,
    isSending,
    isMessagesRefreshing,
    loadingStatus,
    messagesContainerRef,
    setNewMessage,
    toggleExpanded,
    handleScroll,
    refreshMessages,
    sendMessage,
    handleUpdateOrderStatus,
    handleDeleteMessage,
    sendCounselMessage,
    handleCancelOrder,
  };
}
