"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensurePushSubscription, registerAndActivateSW } from "@/lib/push";
import {
  applyVapidKey,
  clearNotifyOffFlag,
  detachPushEndpoint,
  getVapidPublicKey,
  isPushRuntimeAvailable,
  postRoleSubscribe,
  postRoleUnsubscribe,
  requestPushPermissionIfNeeded,
  runRoleSubscriptionCheck,
  setNotifyOffFlag,
  type PushAlertMessages,
  type PushRole,
} from "./useRolePushSubscription.helpers";

type UseRolePushSubscriptionInput<IdKey extends string> = {
  actorId: number | null;
  actorIdKey: IdKey;
  role: PushRole;
  notifyOffKeyPrefix: string;
  subscribePath: string;
  statusPath: string;
  unsubscribePath: string;
  alerts: PushAlertMessages;
};

export function useRolePushSubscription<IdKey extends string>({
  actorId,
  actorIdKey,
  role,
  notifyOffKeyPrefix,
  subscribePath,
  statusPath,
  unsubscribePath,
  alerts,
}: UseRolePushSubscriptionInput<IdKey>) {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const isSubscribingRef = useRef(false);

  const syncSubscription = useCallback(
    async (subscription: PushSubscription, appKey?: string) => {
      if (actorId == null) {
        throw new Error(`Missing ${actorIdKey}`);
      }

      await postRoleSubscribe({
        subscribePath,
        actorIdKey,
        actorId,
        role,
        subscription,
      });

      clearNotifyOffFlag(notifyOffKeyPrefix, actorId);

      if (appKey) {
        applyVapidKey(appKey);
      }

      setIsSubscribed(true);
    },
    [actorId, actorIdKey, notifyOffKeyPrefix, role, subscribePath]
  );

  const subscribePush = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (actorId == null) return;
      if (!isPushRuntimeAvailable()) {
        setIsSubscribed(false);
        return;
      }
      if (isSubscribingRef.current) return;

      const canProceed = await requestPushPermissionIfNeeded({
        silent,
        permissionDeniedMessage: alerts.permissionDenied,
        setIsSubscribed,
      });
      if (!canProceed) {
        return;
      }

      setIsSubscribeLoading(true);
      isSubscribingRef.current = true;

      try {
        const registration = await registerAndActivateSW();
        const appKey = getVapidPublicKey();

        if (!appKey) {
          if (!silent) {
            alert(alerts.missingConfig);
          }
          setIsSubscribed(false);
          return;
        }

        const subscription = await ensurePushSubscription({
          reg: registration,
          appKey,
          onUnsubscribe: async (staleSubscription) => {
            try {
              await detachPushEndpoint(staleSubscription.endpoint);
            } catch {}
          },
        });

        if (!subscription) {
          setIsSubscribed(false);
          return;
        }

        await syncSubscription(subscription, appKey);
      } catch (error) {
        console.error(error);
        if (!silent) {
          alert(alerts.subscribeFailed);
        }
      } finally {
        isSubscribingRef.current = false;
        setIsSubscribeLoading(false);
      }
    },
    [actorId, alerts, syncSubscription]
  );

  const resubscribePush = useCallback(
    async (existingSubscription: PushSubscription | null, appKey: string) => {
      try {
        await existingSubscription?.unsubscribe();
      } catch {}

      await subscribePush({ silent: true });
      applyVapidKey(appKey);
    },
    [subscribePush]
  );

  useEffect(() => {
    if (actorId == null) return;

    const checkSubscription = async () => {
      try {
        await runRoleSubscriptionCheck({
          actorId,
          statusPath,
          actorIdKey,
          role,
          notifyOffKeyPrefix,
          isSubscribingRef,
          setIsSubscribed,
          subscribeSilently: () => subscribePush({ silent: true }),
          syncSubscription,
          resubscribe: resubscribePush,
        });
      } catch (error) {
        console.error(error);
        setIsSubscribed(null);
      }
    };

    void checkSubscription();

    const onControllerChange = () => {
      void checkSubscription();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
      }
    };
  }, [
    actorId,
    actorIdKey,
    notifyOffKeyPrefix,
    resubscribePush,
    role,
    statusPath,
    subscribePush,
    syncSubscription,
  ]);

  const unsubscribePush = useCallback(async () => {
    if (actorId == null) return;
    if (!isPushRuntimeAvailable()) {
      setIsSubscribed(false);
      return;
    }
    if (isSubscribingRef.current) return;

    setIsSubscribeLoading(true);
    isSubscribingRef.current = true;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await postRoleUnsubscribe({
          unsubscribePath,
          actorIdKey,
          actorId,
          role,
          endpoint: subscription.endpoint,
        });

        await subscription.unsubscribe();
      }

      setNotifyOffFlag(notifyOffKeyPrefix, actorId);
      setIsSubscribed(false);
    } catch (error) {
      console.error(error);
      alert(alerts.unsubscribeFailed);
    } finally {
      isSubscribingRef.current = false;
      setIsSubscribeLoading(false);
    }
  }, [
    actorId,
    actorIdKey,
    alerts.unsubscribeFailed,
    notifyOffKeyPrefix,
    role,
    unsubscribePath,
  ]);

  const toggleSubscription = useCallback(() => {
    if (isSubscribed) {
      void unsubscribePush();
      return;
    }

    void subscribePush();
  }, [isSubscribed, subscribePush, unsubscribePush]);

  return {
    isSubscribed,
    isSubscribeLoading,
    toggleSubscription,
  };
}
