"use client";

import { OrderSelfServiceCard } from "./OrderSelfServiceCard";
import { buildOrderNotificationSelfService } from "@/lib/order/self-service";

type CustomerOrderNotificationSelfServiceCardProps = {
  isSubscribed: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  browserSupported: boolean;
  isLoading: boolean;
  onEnableNotifications: () => void;
};

export default function CustomerOrderNotificationSelfServiceCard({
  isSubscribed,
  notificationPermission,
  browserSupported,
  isLoading,
  onEnableNotifications,
}: CustomerOrderNotificationSelfServiceCardProps) {
  const model = buildOrderNotificationSelfService({
    isSubscribed,
    notificationPermission,
    browserSupported,
    isLoading,
  });

  return (
    <OrderSelfServiceCard
      model={model}
      onPrimaryAction={model.primaryActionLabel ? onEnableNotifications : null}
      className="mt-5"
      hideBehindBeta={false}
    />
  );
}
