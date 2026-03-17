"use client";

import React from "react";
import OrderProgressBar from "@/components/order/orderProgressBar";
import OrderAccordionHeader from "@/components/order/orderAccordionHeader";
import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import {
  PharmOrderCopilotSection,
  PharmOrderCustomerInfoSection,
  PharmOrderItemsSection,
  PharmOrderMessagesSection,
  PharmOrderStatusActionsSection,
  PharmUser360Section,
} from "./pharmOrderAccordionSections";
import { PharmOrderTriageStrip } from "./pharmTriage";
import { usePharmOrderAccordionItem } from "./hooks/usePharmOrderAccordionItem";

type PharmActor = {
  id: number;
} | null;

type OrderAccordionItemProps = {
  initialOrder: OrderAccordionOrder;
  isInitiallyExpanded: boolean;
  pharm: PharmActor;
};

export default function OrderAccordionItem({
  initialOrder,
  isInitiallyExpanded,
  pharm,
}: OrderAccordionItemProps) {
  const {
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
  } = usePharmOrderAccordionItem({
    initialOrder,
    isInitiallyExpanded,
    pharm,
  });

  if (isExpanded && !isLoaded) {
    return (
      <div className="mx-auto w-full max-w-[640px] bg-white px-6 py-6 sm:rounded-lg sm:shadow-md">
        <OrderAccordionHeader
          role="pharmacist"
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
        role="pharmacist"
        order={order}
        isExpanded={isExpanded}
        toggle={toggleExpanded}
      />
      <PharmOrderTriageStrip
        order={order}
        messages={messages.length > 0 ? messages : order.messagesPreview}
      />
      {isExpanded ? (
        <div className="mt-4 border-t pb-4 pt-16 sm:px-4 sm:pt-12">
          <OrderProgressBar currentStatus={order.status} />

          <PharmOrderStatusActionsSection
            order={order}
            loadingStatus={loadingStatus}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onCancelOrder={handleCancelOrder}
          />

          <PharmOrderItemsSection order={order} />

          <PharmUser360Section summary={user360} />

          <PharmOrderCopilotSection
            order={order}
            messages={messages}
            onApplyDraft={setNewMessage}
          />

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
