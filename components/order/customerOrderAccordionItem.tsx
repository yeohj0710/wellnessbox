"use client";

import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import CustomerOrderProgressCoach from "./CustomerOrderProgressCoach";
import CustomerOrderNotificationSelfServiceCard from "./CustomerOrderNotificationSelfServiceCard";
import DeliveryExperienceCoachCard from "./DeliveryExperienceCoachCard";
import OfflineTouchpointCoachCard from "./OfflineTouchpointCoachCard";
import OrderAccordionHeader from "./orderAccordionHeader";
import OrderProgressBar from "./orderProgressBar";
import SatisfactionRecoveryCard from "./SatisfactionRecoveryCard";
import {
  CustomerOrderItemsSection,
  CustomerOrderMessagesSection,
  CustomerOrderPharmacySection,
} from "./customerOrderAccordionSections";
import type { OrderAccordionOrder } from "./orderAccordion.types";
import { useCustomerOrderAccordionItem } from "./useCustomerOrderAccordionItem";

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
  const {
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
  } = useCustomerOrderAccordionItem({
    initialOrder,
    isInitiallyExpanded,
  });

  const isSubscriptionBusy = isSubscribeLoading || isSubscriptionStatusLoading;

  if (isExpanded && !isLoaded) {
    return (
      <div className="mx-auto w-full max-w-[640px] bg-white px-3 py-6 sm:rounded-lg sm:px-6 sm:shadow-md">
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
        <div className="mt-4 border-t px-0 pb-4 pt-16 sm:px-4 sm:pt-12">
          <div className="mb-6 mt-2 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] bg-white px-3 py-6 sm:rounded-lg sm:px-6 sm:shadow-md">
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
      {isExpanded ? (
        <div className="mt-4 border-t px-0 pb-4 pt-16 sm:px-4 sm:pt-12">
          <OrderProgressBar currentStatus={order.status} />
          <BetaFeatureGate
            title="Beta 주문 가이드"
            helper="새로 추가된 진행 코치와 회복 가이드는 필요할 때만 펼쳐볼 수 있어요."
            className="mt-5"
          >
            <div className="space-y-5">
              <CustomerOrderProgressCoach
                order={order}
                messages={messages}
                isSubscribed={!!isSubscribed}
                actionLoading={isSubscriptionBusy}
                onOpenMessages={focusMessageComposer}
                onToggleSubscription={toggleSubscription}
              />
              <SatisfactionRecoveryCard
                mode="order"
                order={order}
                messages={messages}
                onPrimaryAction={focusMessageComposer}
                hideBehindBeta={false}
              />
              <DeliveryExperienceCoachCard
                order={order}
                messages={messages}
                surface="my-orders"
                onOpenMessages={focusMessageComposer}
              />
              <OfflineTouchpointCoachCard
                order={order}
                messages={messages}
                surface="my-orders"
              />
              <CustomerOrderNotificationSelfServiceCard
                isSubscribed={!!isSubscribed}
                notificationPermission={notificationPermission}
                browserSupported={browserSupported}
                isLoading={isSubscriptionStatusLoading}
                onEnableNotifications={toggleSubscription}
              />
            </div>
          </BetaFeatureGate>
          <CustomerOrderItemsSection order={order} />
          <div ref={messagesSectionRef}>
            <CustomerOrderMessagesSection
              order={order}
              messages={messages}
              newMessage={newMessage}
              isSending={isSending}
              isMessagesRefreshing={isMessagesRefreshing}
              messagesContainerRef={messagesContainerRef}
              messageInputRef={messageInputRef}
              refreshMessages={refreshMessages}
              handleScroll={handleScroll}
              handleDeleteMessage={handleDeleteMessage}
              setNewMessage={setNewMessage}
              sendMessage={sendMessage}
            />
          </div>
          <CustomerOrderPharmacySection order={order} />
        </div>
      ) : null}
    </div>
  );
}
