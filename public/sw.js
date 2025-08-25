const VERSION = "v3";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function toDataURLFromBlob(blob) {
  const ab = await blob.arrayBuffer();
  const u8 = new Uint8Array(ab);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const b64 = btoa(s);
  const mime = blob.type || "image/png";
  return `data:${mime};base64,${b64}`;
}

self.addEventListener("push", function (event) {
  event.waitUntil(
    (async () => {
      const data = event.data ? event.data.json() : {};
      const src = typeof data.image === "string" ? data.image.trim() : "";
      let imageForNotification = null;
      if (src) {
        try {
          const resp = await fetch(src, { mode: "cors" });
          if (resp.ok) {
            const blob = await resp.blob();
            const bmp = await createImageBitmap(blob);
            const targetW = 800;
            const targetH = 400;
            const canvas = new OffscreenCanvas(targetW, targetH);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, targetW, targetH);
              const scale = Math.min(targetW / bmp.width, targetH / bmp.height);
              const drawW = bmp.width * scale;
              const drawH = bmp.height * scale;
              const dx = (targetW - drawW) / 2;
              const dy = (targetH - drawH) / 2;
              ctx.drawImage(bmp, dx, dy, drawW, drawH);
              const outBlob = await canvas.convertToBlob({ type: "image/png" });
              imageForNotification = await toDataURLFromBlob(outBlob);
            }
          }
        } catch {}
        if (!imageForNotification) imageForNotification = src;
      }
      const title = data.title || "WellnessBox 알림";
      const options = {
        body: data.body || "",
        vibrate: [100, 50, 100],
        requireInteraction: true,
        actions: data.actions || [{ action: "open", title: "열기" }],
        data: { url: data.url },
        icon: data.icon || "/logo.png",
        badge: data.badge || "/logo.png",
      };
      if (imageForNotification) options.image = imageForNotification;
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/my-orders";
  event.waitUntil(clients.openWindow(url));
});
