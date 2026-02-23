"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import { getOrderById, getOrderStatusById } from "@/lib/order";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import OrderProgressBar from "./orderProgressBar";
import OrderAccordionHeader from "./orderAccordionHeader";
import {
  getLastMessageId,
  sortMessagesByCreatedAt,
} from "./customerOrderAccordion.helpers";
import {
  CustomerOrderItemsSection,
  CustomerOrderMessagesSection,
  CustomerOrderPharmacySection,
} from "./customerOrderAccordionSections";
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

export type CustomerOrderAccordionItemProps = {
  initialOrder: OrderAccordionOrder;
  isInitiallyExpanded: boolean;
  onBack?: () => void;
};

export default function CustomerOrderAccordionItem({
  initialOrder,
  isInitiallyExpanded,
  onBack,
}: CustomerOrderAccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [order, setOrder] = useState<OrderAccordionOrder>(initialOrder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
  const {
    isSubscribed,
    isSubscriptionStatusLoading,
    isSubscribeLoading,
    toggleSubscription,
  } = useCustomerOrderPushState({
    orderId: Number(order.id),
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef(false);
  const lastSeenIdRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = gap < 80;
  };

  useEffect(() => {
    if (!isExpanded || isLoaded) return;

    let cancelled = false;

    async function fetchDetailsAndMessages() {
      try {
        const [detailedOrder, msgs] = await Promise.all([
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

        const sorted = sortMessagesByCreatedAt(msgs);
        setMessages(sorted);

        const lastId = getLastMessageId(sorted);
        lastSeenIdRef.current = lastId;

        setIsLoaded(true);
      } catch (e) {
        console.error(e);
      }
    }

    fetchDetailsAndMessages();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, isLoaded, initialOrder.id]);

  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    const intervalId = setInterval(() => {
      refreshOrderStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isExpanded, isLoaded]);
  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    const tick = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const msgs = await getMessagesByOrder(order.id);
        const sorted = sortMessagesByCreatedAt(msgs);
        const newLastId = getLastMessageId(sorted);
        const hasNew = newLastId > lastSeenIdRef.current;

        setMessages(sorted);

        if (hasNew && isNearBottomRef.current) {
          scrollToBottom();
        }
        if (hasNew) {
          lastSeenIdRef.current = newLastId;
        }
      } catch (e) {
        console.error(e);
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
    const id: ReturnType<typeof setInterval> = setInterval(
      tick,
      POLL_INTERVAL_MS
    );
    return () => {
      clearInterval(id);
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [isExpanded, isLoaded, order.id]);
  useEffect(() => {
    if (!isExpanded || !isLoaded) return;
    requestAnimationFrame(() => {
      const lastId = messages.length ? messages[messages.length - 1].id : 0;
      lastSeenIdRef.current = Math.max(lastSeenIdRef.current, lastId);
      scrollToBottom();
    });
  }, [isExpanded, isLoaded, messages.length]);
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
  const refreshMessages = async (manual: boolean = false) => {
    if (manual) setIsMessagesRefreshing(true);
    try {
      const msgs = await getMessagesByOrder(order.id);
      const sorted = sortMessagesByCreatedAt(msgs);
      setMessages(sorted);
      const latestId = getLastMessageId(sorted);
      if (latestId > 0) {
        lastSeenIdRef.current = latestId;
      }
      scrollToBottom();
    } catch (error) {
      console.error(error);
    } finally {
      if (manual) setIsMessagesRefreshing(false);
    }
  };
  const isSubscriptionBusy = isSubscribeLoading || isSubscriptionStatusLoading;

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    const messageData = {
      orderId: order.id,
      content: newMessage,
    };
    try {
      const newMsg = (await createMessage(messageData)) as OrderMessage;
      setMessages((prev) => sortMessagesByCreatedAt([...prev, newMsg]));
      lastSeenIdRef.current = newMsg.id || lastSeenIdRef.current;
      scrollToBottom();
      setNewMessage("");
    } catch (error) {
      console.error(error);
      alert("메시지 전송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  };
  const handleDeleteMessage = async (messageId: number) => {
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
  };
  if (isExpanded && !isLoaded) {
    return (
      <div className="w-full max-w-[640px] mx-auto px-3 sm:px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
        <OrderAccordionHeader
          role="customer"
          order={order}
          isExpanded={isExpanded}
          toggle={toggleExpanded}
          onBack={onBack}
          isSubscribed={!!isSubscribed}
          toggleSubscription={toggleSubscription}
          subscriptionLoading={isSubscriptionBusy}
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
    <div className="w-full max-w-[640px] mx-auto px-3 sm:px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
      <OrderAccordionHeader
        role="customer"
        order={order}
        isExpanded={isExpanded}
        toggle={toggleExpanded}
        onBack={onBack}
        isSubscribed={!!isSubscribed}
        toggleSubscription={toggleSubscription}
        subscriptionLoading={isSubscriptionBusy}
      />
      {isExpanded && (
        <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
          <OrderProgressBar currentStatus={order.status} />
          <CustomerOrderItemsSection order={order} />
          <CustomerOrderMessagesSection
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
          />
          <CustomerOrderPharmacySection order={order} />
        </div>
      )}
    </div>
  );
}
