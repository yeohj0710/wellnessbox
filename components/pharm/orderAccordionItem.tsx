"use client";

import React, { useEffect, useRef, useState } from "react";
import { getOrderById, getOrderStatusById } from "@/lib/order";
import { updateOrderStatus } from "@/lib/order/mutations";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import OrderProgressBar from "@/components/order/orderProgressBar";
import OrderAccordionHeader from "@/components/order/orderAccordionHeader";
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
  PharmOrderCustomerInfoSection,
  PharmOrderItemsSection,
  PharmOrderMessagesSection,
  PharmOrderStatusActionsSection,
} from "./pharmOrderAccordionSections";

const POLL_INTERVAL_MS = 10_000;

type PharmActor = {
  id: number;
} | null;

type OrderAccordionItemProps = {
  initialOrder: OrderAccordionOrder;
  isInitiallyExpanded: boolean;
  pharm: PharmActor;
};

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  );
}

export default function OrderAccordionItem({
  initialOrder,
  isInitiallyExpanded,
  pharm,
}: OrderAccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [order, setOrder] = useState<OrderAccordionOrder>(initialOrder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef(false);
  const lastSeenIdRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);

  const scrollToBottom = () => {
    const element = messagesContainerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  };

  const handleScroll = () => {
    const element = messagesContainerRef.current;
    if (!element) return;
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
    isNearBottomRef.current = gap < 80;
  };

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

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    const intervalId = setInterval(() => {
      void refreshOrderStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isExpanded, isLoaded, order.id]);

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
        if (hasNew && isNearBottomRef.current) scrollToBottom();
        if (hasNew) lastSeenIdRef.current = nextLastId;
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
  }, [isExpanded, isLoaded, order.id]);

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    requestAnimationFrame(() => {
      const latestId = getLastMessageId(messages);
      lastSeenIdRef.current = Math.max(lastSeenIdRef.current, latestId);
      scrollToBottom();
    });
  }, [isExpanded, isLoaded, messages]);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const refreshOrderStatus = async () => {
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
  };

  const refreshMessages = async (manual = false) => {
    if (manual) setIsMessagesRefreshing(true);
    try {
      const incomingMessages = await getMessagesByOrder(order.id);
      const sortedMessages = sortMessagesByCreatedAt(
        incomingMessages as OrderMessage[]
      );
      setMessages(sortedMessages);
      const latestId = getLastMessageId(sortedMessages);
      if (latestId > 0) lastSeenIdRef.current = latestId;
      scrollToBottom();
    } catch (error) {
      console.error(error);
    } finally {
      if (manual) setIsMessagesRefreshing(false);
    }
  };

  const sendMessage = async () => {
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
  };

  const handleUpdateOrderStatus = async (
    orderId: number,
    newStatus: OrderStatus
  ) => {
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
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm("정말로 메시지를 삭제할까요?")) return;

    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (error) {
      console.error(error);
      alert("메시지 삭제에 실패했습니다.");
    }
  };

  const sendCounselMessage = async () => {
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
  };

  const handleCancelOrder = () => {
    if (!window.confirm("정말로 주문을 취소할까요?")) return;
    void handleUpdateOrderStatus(order.id, ORDER_STATUS.CANCELED);
  };

  if (isExpanded && !isLoaded) {
    return (
      <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
        <OrderAccordionHeader
          role="pharmacist"
          order={order}
          isExpanded={isExpanded}
          toggle={toggleExpanded}
        />
        <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
          <div className="flex justify-center items-center mt-2 mb-6">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
      <OrderAccordionHeader
        role="pharmacist"
        order={order}
        isExpanded={isExpanded}
        toggle={toggleExpanded}
      />
      {isExpanded ? (
        <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
          <OrderProgressBar currentStatus={order.status} />

          <PharmOrderStatusActionsSection
            order={order}
            loadingStatus={loadingStatus}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onCancelOrder={handleCancelOrder}
          />

          <PharmOrderItemsSection order={order} />

          <PharmOrderMessagesSection
            order={order}
            messages={messages}
            newMessage={newMessage}
            isSending={isSending}
            isMessagesRefreshing={isMessagesRefreshing}
            messagesContainerRef={messagesContainerRef}
            refreshMessages={refreshMessages}
            handleScroll={handleScroll}
            handleDeleteMessage={handleDeleteMessage}
            setNewMessage={setNewMessage}
            sendMessage={sendMessage}
            sendCounselMessage={sendCounselMessage}
          />

          <PharmOrderCustomerInfoSection order={order} />
        </div>
      ) : null}
    </div>
  );
}
