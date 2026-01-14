export function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = typeof window !== 'undefined' ? window.atob(base64Safe) : Buffer.from(base64Safe, 'base64').toString('binary');
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export function uint8ArrayToUrlBase64(u8: Uint8Array) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const base64 =
    typeof window !== "undefined"
      ? btoa(s)
      : Buffer.from(s, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getSubAppKeyBase64(reg: ServiceWorkerRegistration) {
  const sub = await reg.pushManager.getSubscription();
  const ab = (sub as any)?.options?.applicationServerKey as ArrayBuffer | undefined;
  if (!ab) return null;
  return uint8ArrayToUrlBase64(new Uint8Array(ab));
}

const PUSH_LOCK_NAME = "wb-push-subscribe";
const PUSH_LOCK_TTL_MS = 8000;
const PUSH_LOCK_RETRY_MS = 200;
const pushInFlight = new Map<string, Promise<PushSubscription | null>>();

async function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withPushLock<T>(lockName: string, task: () => Promise<T>) {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    const locks = navigator.locks;
    if (locks?.request) {
      return locks.request(lockName, { mode: "exclusive" }, task);
    }
  }

  if (typeof window !== "undefined") {
    const lockKey = `${lockName}:lock`;
    const start = Date.now();
    while (true) {
      const now = Date.now();
      const existing = Number(localStorage.getItem(lockKey) || 0);
      if (!existing || now - existing > PUSH_LOCK_TTL_MS) {
        localStorage.setItem(lockKey, String(now));
        try {
          return await task();
        } finally {
          localStorage.removeItem(lockKey);
        }
      }
      if (now - start > PUSH_LOCK_TTL_MS) {
        return task();
      }
      await delay(PUSH_LOCK_RETRY_MS);
    }
  }

  return task();
}

type EnsurePushSubscriptionOptions = {
  reg: ServiceWorkerRegistration;
  appKey: string;
  onUnsubscribe?: (sub: PushSubscription) => Promise<void>;
  storedKey?: string;
  lockKey?: string;
};

export async function ensurePushSubscription({
  reg,
  appKey,
  onUnsubscribe,
  storedKey,
  lockKey,
}: EnsurePushSubscriptionOptions) {
  const lockName = lockKey || PUSH_LOCK_NAME;
  const cached = pushInFlight.get(lockName);
  if (cached) {
    return cached;
  }

  const task = withPushLock(lockName, async () => {
    let sub = await reg.pushManager.getSubscription();
    const subAppKey = sub ? await getSubAppKeyBase64(reg) : null;
    const localKey =
      storedKey ??
      (typeof window !== "undefined"
        ? localStorage.getItem("vapidKey") || ""
        : "");
    const mismatch =
      !!sub &&
      ((localKey && localKey !== appKey) ||
        (subAppKey && subAppKey !== appKey));

    if (mismatch && sub) {
      try {
        await onUnsubscribe?.(sub);
      } catch {}
      try {
        await sub.unsubscribe();
      } catch {}
      sub = null;
    }

    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(appKey),
        });
      } catch {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          try {
            await onUnsubscribe?.(existing);
          } catch {}
          try {
            await existing.unsubscribe();
          } catch {}
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(appKey),
        });
      }
    }

    return sub;
  });

  pushInFlight.set(lockName, task);
  try {
    return await task;
  } finally {
    pushInFlight.delete(lockName);
  }
}

export const registerAndActivateSW = async () => {
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
  await reg.update();
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await Promise.race([
      new Promise<void>((resolve) => {
        const onChange = () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.removeEventListener("controllerchange", onChange);
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener("controllerchange", onChange);
      }),
      delay(2000),
    ]);
  }
  if (reg.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    await new Promise<void>((resolve) => {
      const onChange = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
    });
  }
  return reg;
};
