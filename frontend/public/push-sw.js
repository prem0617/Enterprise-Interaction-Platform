// Activate immediately — don't wait for existing tabs to close.
// Without this, Chromium leaves the SW in "waiting" state and push events are lost.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = { title: "Notification", body: "", url: "/" };
      try {
        if (event.data) {
          const text = await event.data.text();
          Object.assign(data, JSON.parse(text));
        }
      } catch {
        /* keep defaults */
      }

      await self.registration.showNotification(data.title || "Notification", {
        body: data.body || "",
        icon: "/favicon.ico",
        tag: data.tag || "eip",
        data: { url: data.url || "/" },
        requireInteraction: false,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const target = url.startsWith("http") ? url : new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
