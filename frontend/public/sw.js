/* global self, clients */
self.addEventListener("push", (event) => {
  let payload = {
    title: "Enterprise Platform",
    body: "",
    url: "/",
    tag: "eip",
    actions: [],
    data: {},
  };
  try {
    if (event.data) {
      const j = event.data.json();
      payload = {
        title: j.title || payload.title,
        body: j.body || "",
        url: j.url || "/",
        tag: j.tag || "eip",
        actions: j.actions || [],
        data: {
          ...(j.data || {}),
          url: j.data?.url || j.url || "/",
          apiBase: j.data?.apiBase || "",
        },
      };
    }
  } catch (_) {
    /* ignore */
  }

  const options = {
    body: payload.body,
    icon: "/vite.svg",
    badge: "/vite.svg",
    tag: payload.tag,
    data: payload.data,
    actions: payload.actions,
    requireInteraction: payload.data?.type === "incoming_call",
    vibrate: [160, 70, 160],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

function openOrFocusUrl(url) {
  const target = url || "/";
  return clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      let origin;
      try {
        origin = new URL(target, self.location.origin).origin;
      } catch {
        origin = self.location.origin;
      }
      for (const c of clientList) {
        try {
          if (c.url.startsWith(origin)) {
            if (c.navigate) {
              c.navigate(target);
            }
            return c.focus();
          }
        } catch (_) {
          /* continue */
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    });
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  n.close();
  const d = n.data || {};
  const action = event.action || "";
  const apiBase = d.apiBase || "";

  if (d.type === "incoming_call" && d.token) {
    if (action === "reject") {
      event.waitUntil(
        fetch(`${apiBase}/api/push/call-response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: d.token, accept: false }),
        }).catch(() => {})
      );
      return;
    }
    const openUrl = d.url || "/";
    event.waitUntil(openOrFocusUrl(openUrl));
    return;
  }

  let url = d.url || "/";
  if (action === "reply") {
    url += (url.includes("?") ? "&" : "?") + "focusComposer=1";
  }
  event.waitUntil(openOrFocusUrl(url));
});
