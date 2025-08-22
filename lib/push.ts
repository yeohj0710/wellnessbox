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

export const registerAndActivateSW = async () => {
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
  await reg.update();
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
