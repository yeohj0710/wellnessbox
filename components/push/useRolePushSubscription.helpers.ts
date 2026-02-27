"use client";

import { getSubAppKeyBase64, registerAndActivateSW } from "@/lib/push";

export type PushRole = "pharm" | "rider";

export type PushAlertMessages = {
  permissionDenied: string;
  missingConfig: string;
  subscribeFailed: string;
  unsubscribeFailed: string;
};

export type PushStatusResponse = {
  subscribed?: boolean;
  action?: string;
};

export const DEFAULT_PUSH_ALERT_MESSAGES_KO: PushAlertMessages = {
  permissionDenied:
    "\ube0c\ub77c\uc6b0\uc800 \uc124\uc815\uc5d0\uc11c \uc54c\ub9bc \uad8c\ud55c\uc744 \ud5c8\uc6a9\ud574 \uc8fc\uc138\uc694.",
  missingConfig:
    "\uc54c\ub9bc \ud0a4 \uc124\uc815\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
  subscribeFailed:
    "\uc54c\ub9bc \uc124\uc815 \uc911 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc5b4\uc694. \uc7a0\uc2dc \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
  unsubscribeFailed:
    "\uc54c\ub9bc \ud574\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.",
} as const;

type SetIsSubscribed = (value: boolean | null) => void;

type RolePayloadArgs<IdKey extends string> = {
  actorIdKey: IdKey;
  actorId: number;
  role: PushRole;
};

export function buildNotifyOffKey(prefix: string, actorId: number) {
  return `${prefix}${actorId}`;
}

function buildRolePayload<IdKey extends string>(
  args: RolePayloadArgs<IdKey>,
  payload: Record<string, unknown>
) {
  const { actorIdKey, actorId, role } = args;
  return {
    [actorIdKey]: actorId,
    role,
    ...payload,
  } as Record<IdKey, number> & Record<string, unknown>;
}

export function getVapidPublicKey() {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
}

export function isPushRuntimeAvailable() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

export function applyVapidKey(appKey: string) {
  localStorage.setItem("vapidKey", appKey);
}

export function hasNotifyOffFlag(prefix: string, actorId: number) {
  return localStorage.getItem(buildNotifyOffKey(prefix, actorId)) === "true";
}

export function clearNotifyOffFlag(prefix: string, actorId: number) {
  localStorage.removeItem(buildNotifyOffKey(prefix, actorId));
}

export function setNotifyOffFlag(prefix: string, actorId: number) {
  localStorage.setItem(buildNotifyOffKey(prefix, actorId), "true");
}

export function hasVapidKeyMismatch(args: {
  appKey: string;
  subAppKey?: string | null;
  storedKey: string;
}) {
  const { appKey, subAppKey, storedKey } = args;
  return (storedKey && storedKey !== appKey) || (subAppKey && subAppKey !== appKey);
}

export async function detachPushEndpoint(endpoint: string) {
  await fetch("/api/push/detach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

export async function postRoleSubscribe<IdKey extends string>(args: {
  subscribePath: string;
  actorIdKey: IdKey;
  actorId: number;
  role: PushRole;
  subscription: PushSubscription;
}) {
  const { subscribePath, actorIdKey, actorId, role, subscription } = args;
  const response = await fetch(subscribePath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      buildRolePayload({ actorIdKey, actorId, role }, { subscription })
    ),
  });

  if (!response.ok) {
    throw new Error("Failed to sync subscription");
  }
}

export async function postRoleStatus<IdKey extends string>(args: {
  statusPath: string;
  actorIdKey: IdKey;
  actorId: number;
  role: PushRole;
  endpoint: string;
}) {
  const { statusPath, actorIdKey, actorId, role, endpoint } = args;
  const response = await fetch(statusPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      buildRolePayload({ actorIdKey, actorId, role }, { endpoint })
    ),
  });

  if (!response.ok) {
    throw new Error("Failed to check subscription");
  }

  return (await response.json()) as PushStatusResponse;
}

export async function postRoleUnsubscribe<IdKey extends string>(args: {
  unsubscribePath: string;
  actorIdKey: IdKey;
  actorId: number;
  role: PushRole;
  endpoint: string;
}) {
  const { unsubscribePath, actorIdKey, actorId, role, endpoint } = args;
  const response = await fetch(unsubscribePath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      buildRolePayload({ actorIdKey, actorId, role }, { endpoint })
    ),
  });

  if (!response.ok) {
    throw new Error("Failed to unsubscribe");
  }
}

export async function requestPushPermissionIfNeeded(args: {
  silent: boolean;
  permissionDeniedMessage: string;
  setIsSubscribed: SetIsSubscribed;
}) {
  const { silent, permissionDeniedMessage, setIsSubscribed } = args;
  if (!isPushRuntimeAvailable()) {
    setIsSubscribed(false);
    return false;
  }
  if (Notification.permission === "denied") {
    if (!silent) {
      alert(permissionDeniedMessage);
    }
    setIsSubscribed(false);
    return false;
  }

  if (Notification.permission === "default") {
    if (silent) {
      setIsSubscribed(false);
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert(permissionDeniedMessage);
      setIsSubscribed(false);
      return false;
    }
  }

  return true;
}

export async function runRoleSubscriptionCheck<IdKey extends string>(args: {
  actorId: number;
  actorIdKey: IdKey;
  role: PushRole;
  notifyOffKeyPrefix: string;
  statusPath: string;
  isSubscribingRef: { current: boolean };
  setIsSubscribed: SetIsSubscribed;
  subscribeSilently: () => Promise<void>;
  syncSubscription: (subscription: PushSubscription, appKey: string) => Promise<void>;
  resubscribe: (subscription: PushSubscription | null, appKey: string) => Promise<void>;
}) {
  const {
    actorId,
    actorIdKey,
    role,
    notifyOffKeyPrefix,
    statusPath,
    isSubscribingRef,
    setIsSubscribed,
    subscribeSilently,
    syncSubscription,
    resubscribe,
  } = args;

  if (!isPushRuntimeAvailable()) {
    setIsSubscribed(false);
    return;
  }
  if (isSubscribingRef.current) return;

  if (Notification.permission === "denied") {
    setIsSubscribed(false);
    return;
  }

  const registration = await registerAndActivateSW();
  const appKey = getVapidPublicKey();

  if (!appKey) {
    setIsSubscribed(false);
    return;
  }

  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const subAppKey = await getSubAppKeyBase64(registration);
    const storedKey = localStorage.getItem("vapidKey") || "";
    if (
      hasVapidKeyMismatch({
        appKey,
        subAppKey,
        storedKey,
      })
    ) {
      try {
        await detachPushEndpoint(subscription.endpoint);
      } catch {}

      setIsSubscribed(false);
      return;
    }
  }

  if (!subscription) {
    if (hasNotifyOffFlag(notifyOffKeyPrefix, actorId)) {
      setIsSubscribed(false);
      return;
    }

    if (Notification.permission === "granted") {
      await subscribeSilently();
    } else {
      setIsSubscribed(false);
    }
    return;
  }

  if (hasNotifyOffFlag(notifyOffKeyPrefix, actorId)) {
    setIsSubscribed(false);
    return;
  }

  const statusData = await postRoleStatus({
    statusPath,
    actorIdKey,
    actorId,
    role,
    endpoint: subscription.endpoint,
  });

  if (statusData.subscribed) {
    setIsSubscribed(true);
    applyVapidKey(appKey);
    return;
  }

  if (statusData.action === "resubscribe") {
    await resubscribe(subscription, appKey);
    return;
  }

  try {
    await syncSubscription(subscription, appKey);
  } catch {
    subscription = await registration.pushManager.getSubscription();
    await resubscribe(subscription, appKey);
  }
}
