"use client";

import React, { useEffect, useRef, useState } from "react";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import OrderAccordionHeader from "@/components/order/orderAccordionHeader";
import OrderProgressBar from "@/components/order/orderProgressBar";
import { getOrderById, getOrderStatusById } from "@/lib/order";
import { updateOrderStatus } from "@/lib/order/mutations";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";
import { getStreamToken } from "@/lib/streamToken";
import {
  RiderOrderCustomerInfoSection,
  RiderOrderItemsSection,
  RiderOrderPharmacyInfoSection,
  RiderOrderStatusActionsSection,
  RiderOrderStatusCopilotSection,
} from "./riderOrderAccordionSections";
import { RiderOrderCopilotStrip } from "./riderOpsCopilot";

const POLL_INTERVAL_MS = 10_000;

type OrderAccordionItemProps = {
  initialOrder: OrderAccordionOrder;
  isInitiallyExpanded: boolean;
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
}: OrderAccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [order, setOrder] = useState<OrderAccordionOrder>(initialOrder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
  const [isStateRefreshing, setIsStateRefreshing] = useState(false);
  const [, setMessages] = useState<OrderMessage[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isExpanded || isLoaded) return;

    let cancelled = false;

    async function fetchDetails() {
      try {
        const detailedOrder = await getOrderById(initialOrder.id);
        if (cancelled || !detailedOrder) return;

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
        setIsLoaded(true);
      } catch (error) {
        console.error(error);
      }
    }

    void fetchDetails();

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
    if (!isExpanded) return;

    let cancelled = false;

    const connect = async () => {
      try {
        const token = await getStreamToken("rider", order.id);
        if (cancelled) return;

        const source = new EventSource(`/api/messages/stream/${order.id}?token=${token}`);
        eventSourceRef.current = source;
        source.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as OrderMessage;
            setMessages((prev) =>
              prev.some((item) => item.id === message.id) ? prev : [...prev, message]
            );
          } catch {}
        };
      } catch {}
    };

    void connect();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [isExpanded, order.id]);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const refreshOrderStatus = async (manual = false) => {
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
    } finally {
      if (manual) setIsStateRefreshing(false);
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

  const handleCancelPickup = () => {
    if (!window.confirm("정말로 작업을 취소할까요?")) return;
    void handleUpdateOrderStatus(order.id, ORDER_STATUS.DISPENSE_COMPLETE);
  };

  if (isExpanded && !isLoaded) {
    return (
      <div className="mx-auto w-full max-w-[640px] bg-white px-6 py-6 sm:rounded-lg sm:shadow-md">
        <OrderAccordionHeader
          role="rider"
          order={order}
          isExpanded={isExpanded}
          toggle={toggleExpanded}
        />
        <div className="mt-4 border-t pb-4 pt-16 sm:px-4 sm:pt-12">
          <div className="mb-6 mt-2 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] bg-white px-6 py-6 sm:rounded-lg sm:shadow-md">
      <OrderAccordionHeader
        role="rider"
        order={order}
        isExpanded={isExpanded}
        toggle={toggleExpanded}
      />
      {isExpanded ? (
        <div className="mt-4 border-t pb-4 pt-16 sm:px-4 sm:pt-12">
          <OrderProgressBar currentStatus={order.status} />

          <BetaFeatureGate
            title="Beta 라이더 가이드"
            helper="코파일럿 요약은 필요할 때만 펼쳐보세요."
            className="mt-6"
          >
            <div className="space-y-4">
              <RiderOrderCopilotStrip order={order} />
              <RiderOrderStatusCopilotSection order={order} />
            </div>
          </BetaFeatureGate>

          <RiderOrderStatusActionsSection
            order={order}
            loadingStatus={loadingStatus}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onCancelPickup={handleCancelPickup}
          />

          <button
            type="button"
            onClick={() => void refreshOrderStatus(true)}
            className="mb-4 text-sm text-sky-500 hover:underline"
            disabled={isStateRefreshing}
          >
            {isStateRefreshing ? (
              <InlineSpinnerLabel
                label="상태 확인 중"
                className="text-sky-500"
                spinnerClassName="text-sky-500"
              />
            ) : (
              "상태 새로고침"
            )}
          </button>

          <RiderOrderItemsSection order={order} />
          <RiderOrderPharmacyInfoSection order={order} />
          <RiderOrderCustomerInfoSection order={order} />
        </div>
      ) : null}
    </div>
  );
}
