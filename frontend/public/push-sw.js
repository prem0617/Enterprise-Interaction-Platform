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
        icon: "/vite.svg",
        badge: "/vite.svg",
        tag: data.tag || "eip",
        data: { url: data.url || "/" },
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
