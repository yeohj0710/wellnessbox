"use client";

import { useRolePushSubscription } from "@/components/push/useRolePushSubscription";
import { DEFAULT_PUSH_ALERT_MESSAGES_KO } from "@/components/push/useRolePushSubscription.helpers";

type UsePharmPushSubscriptionInput = {
  pharmacyId: number | null;
};

export function usePharmPushSubscription({
  pharmacyId,
}: UsePharmPushSubscriptionInput) {
  return useRolePushSubscription({
    actorId: pharmacyId,
    actorIdKey: "pharmacyId",
    role: "pharm",
    notifyOffKeyPrefix: "pharmNotifyOff_",
    subscribePath: "/api/pharm-push/subscribe",
    statusPath: "/api/pharm-push/status",
    unsubscribePath: "/api/pharm-push/unsubscribe",
    alerts: DEFAULT_PUSH_ALERT_MESSAGES_KO,
  });
}
