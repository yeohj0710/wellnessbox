"use client";

import { useRolePushSubscription } from "@/components/push/useRolePushSubscription";
import { DEFAULT_PUSH_ALERT_MESSAGES_KO } from "@/components/push/useRolePushSubscription.helpers";

type UseRiderPushSubscriptionInput = {
  riderId: number | null;
};

export function useRiderPushSubscription({
  riderId,
}: UseRiderPushSubscriptionInput) {
  return useRolePushSubscription({
    actorId: riderId,
    actorIdKey: "riderId",
    role: "rider",
    notifyOffKeyPrefix: "riderNotifyOff_",
    subscribePath: "/api/rider-push/subscribe",
    statusPath: "/api/rider-push/status",
    unsubscribePath: "/api/rider-push/unsubscribe",
    alerts: DEFAULT_PUSH_ALERT_MESSAGES_KO,
  });
}
