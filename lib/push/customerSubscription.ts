import {
  ensureGlobalPushSubscription,
  getSubAppKeyBase64,
  registerAndActivateSW,
} from "@/lib/push";

const ACCOUNT_KEY_STORAGE = "customerAccountKey";
const ACCOUNT_KEY_LAST_STORAGE = "customerAccountKey:last";
const VAPID_KEY_STORAGE = "vapidKey";

let ensurePromise: Promise<PushSubscription | null> | null = null;

const isLocalhost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

const canUsePush = () => {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext && !isLocalhost()) return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

const getAppKey = () => (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();

const getAccountKey = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ACCOUNT_KEY_STORAGE) || "";
  } catch {
    return "";
  }
};

const rememberAccountKey = (accountKey: string) => {
  if (!accountKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNT_KEY_LAST_STORAGE, accountKey);
  } catch {}
};

const readLastAccountKey = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ACCOUNT_KEY_LAST_STORAGE) || "";
  } catch {
    return "";
  }
};

const rememberAppKey = (appKey: string) => {
  if (!appKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(VAPID_KEY_STORAGE, appKey);
  } catch {}
};

async function detachEndpoint(endpoint: string) {
  try {
    await fetch("/api/push/detach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {}
}

function logDebug(message: string, context: Record<string, unknown>) {
  if (typeof console === "undefined") return;
  console.warn(message, context);
}

function decodeAppKeyBytes(appKey: string) {
  try {
    const padding = "=".repeat((4 - (appKey.length % 4)) % 4);
    const base64Safe = (appKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = typeof window !== "undefined" ? atob(base64Safe) : "";
    return raw.length;
  } catch {
    return -1;
  }
}

export async function ensureCustomerPushSubscription({
  silent = false,
}: {
  silent?: boolean;
} = {}) {
  if (!canUsePush()) {
    if (!silent) {
      logDebug("Push unavailable in current context", {
        secureContext:
          typeof window !== "undefined" ? window.isSecureContext : null,
        isLocalhost: isLocalhost(),
        hasServiceWorker:
          typeof navigator !== "undefined" && "serviceWorker" in navigator,
        hasPushManager:
          typeof window !== "undefined" && "PushManager" in window,
      });
    }
    return null;
  }

  const appKey = getAppKey();
  if (!appKey) {
    if (!silent)
      logDebug("Missing VAPID public key for push", { appKeyPresent: false });
    return null;
  }

  if (Notification.permission !== "granted") {
    if (!silent) {
      logDebug("Notification permission not granted", {
        permission: Notification.permission,
      });
    }
    return null;
  }

  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const reg = await registerAndActivateSW();

    let sub = await reg.pushManager.getSubscription();

    const storedKey =
      typeof window !== "undefined"
        ? localStorage.getItem(VAPID_KEY_STORAGE) || ""
        : "";
    const subAppKey = sub ? await getSubAppKeyBase64(reg) : null;

    const mismatch =
      !!sub &&
      ((storedKey && storedKey !== appKey) ||
        (subAppKey && subAppKey !== appKey));

    if (sub && mismatch) {
      await detachEndpoint(sub.endpoint);
      try {
        await sub.unsubscribe();
      } catch {}
      sub = null;
    }

    const accountKey = getAccountKey();
    const lastAccountKey = readLastAccountKey();
    if (sub && accountKey && lastAccountKey && accountKey !== lastAccountKey) {
      await detachEndpoint(sub.endpoint);
    }

    if (!sub) {
      try {
        sub = await ensureGlobalPushSubscription({ appKey });
      } catch (error) {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          sub = existing;
        } else {
          if (!silent) {
            logDebug("Push subscription failed", {
              error,
              permission: Notification.permission,
              appKeyPresent: Boolean(appKey),
              appKeyLen: appKey.length,
              appKeyDecodedBytes: decodeAppKeyBytes(appKey),
              swReady: Boolean(navigator.serviceWorker?.controller),
              regScope: reg.scope,
            });
          }
          sub = null;
        }
      }
    }

    if (sub) {
      rememberAppKey(appKey);
      if (accountKey) rememberAccountKey(accountKey);
    }

    return sub;
  })()
    .catch((error) => {
      if (!silent) logDebug("Push subscription ensure failed", { error });
      return null;
    })
    .finally(() => {
      ensurePromise = null;
    });

  return ensurePromise;
}
