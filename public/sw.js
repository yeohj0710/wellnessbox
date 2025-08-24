const VERSION = "v2";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", function (event) {
  event.waitUntil(
    (async () => {
      const data = event.data ? event.data.json() : {};
      let imgUrl = data.image;
      if (imgUrl) {
        try {
          const resp = await fetch(imgUrl);
          const blob = await resp.blob();
          const bmp = await createImageBitmap(blob);
          const targetW = 800,
            targetH = 400;
          const canvas = new OffscreenCanvas(targetW, targetH);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
          const scale = Math.min(targetW / bmp.width, targetH / bmp.height);
          const drawW = bmp.width * scale;
          const drawH = bmp.height * scale;
          const dx = (targetW - drawW) / 2;
          const dy = (targetH - drawH) / 2;
          ctx.drawImage(bmp, dx, dy, drawW, drawH);
          const outBlob = await canvas.convertToBlob({ type: "image/png" });
          imgUrl = URL.createObjectURL(outBlob);
        } catch (e) {}
      }
      const title = data.title || "WellnessBox 알림";
      const options = {
        body: data.body || "",
        icon: data.icon || "/logo.png",
        badge: data.badge || "/logo.png",
        image: imgUrl || "/logo.png",
        vibrate: [100, 50, 100],
        requireInteraction: true,
        actions: data.actions || [{ action: "open", title: "열기" }],
        data: { url: data.url },
      };
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/my-orders";
  event.waitUntil(clients.openWindow(url));
});
