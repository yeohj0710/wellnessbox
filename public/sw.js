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
  const data = event.data ? event.data.json() : {};
  const title = data.title || "WellnessBox 알림";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo.png",
    badge: data.badge || "/logo.png",
    image: data.image || "/logo.png",
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: data.actions || [{ action: "open", title: "열기" }],
    data: { url: data.url },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/my-orders";
  event.waitUntil(clients.openWindow(url));
});
