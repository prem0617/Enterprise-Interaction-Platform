// Activate immediately — don't wait for existing tabs to close.
// Without this, Chromium leaves the SW in "waiting" state and push events are lost.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// ---------------------------------------------------------------------------
// Config cache — stores the VAPID public key so the SW can re-subscribe
// without the main thread when a pushsubscriptionchange event fires.
// ---------------------------------------------------------------------------
const CONFIG_CACHE = "eip-push-config-v1";
const VAPID_KEY_URL = "/_push-config/vapid-key";
const API_BASE_URL = "/_push-config/api-base";

async function saveConfig(vapidKey, apiBase) {
  const cache = await caches.open(CONFIG_CACHE);
  await cache.put(VAPID_KEY_URL, new Response(vapidKey, { headers: { "Content-Type": "text/plain" } }));
  await cache.put(API_BASE_URL, new Response(apiBase, { headers: { "Content-Type": "text/plain" } }));
}

async function loadConfig() {
  try {
    const cache = await caches.open(CONFIG_CACHE);
    const [keyResp, baseResp] = await Promise.all([
      cache.match(VAPID_KEY_URL),
      cache.match(API_BASE_URL),
    ]);
    if (!keyResp || !baseResp) return null;
    const [vapidKey, apiBase] = await Promise.all([keyResp.text(), baseResp.text()]);
    return vapidKey && apiBase ? { vapidKey, apiBase } : null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  // Return a standalone ArrayBuffer — Firefox requires this
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
}

// ---------------------------------------------------------------------------
// Message from main thread — save VAPID key + API base URL into Cache API
// so the SW can use them later in pushsubscriptionchange without a live page.
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SAVE_PUSH_CONFIG") {
    const { vapidKey, apiBase } = event.data;
    if (vapidKey && apiBase) {
      event.waitUntil(saveConfig(vapidKey, apiBase));
    }
  }
});

// ---------------------------------------------------------------------------
// pushsubscriptionchange — fired by Firefox always, Chrome 138+ partially.
// Re-subscribes silently and notifies the backend of the new endpoint so that
// future pushes are delivered to the rotated subscription.
// ---------------------------------------------------------------------------
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const config = await loadConfig();
      if (!config) return; // no stored config — nothing we can do

      const oldEndpoint = event.oldSubscription?.endpoint;

      let newSub;
      try {
        newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.vapidKey),
        });
      } catch {
        return; // subscribe failed (e.g. permission revoked) — bail out
      }

      const json = newSub.toJSON();
      if (!json?.endpoint || !json?.keys?.p256dh || !json?.keys?.auth) return;

      try {
        if (oldEndpoint) {
          // Tell the backend to swap old → new endpoint (no JWT needed)
          await fetch(`${config.apiBase}/notifications/push/rotate-subscription`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oldEndpoint, ...json }),
          });
        } else {
          // No old endpoint available — post to open windows so they can
          // re-sync via the authenticated subscribe route instead.
          const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
          for (const client of windowClients) {
            client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED", subscription: json });
          }
        }
      } catch {
        /* best effort — the next page load's restoreWebPush() will fix it */
      }
    })()
  );
});

// ---------------------------------------------------------------------------
// push — show a browser notification.
// Suppressed when the app window is already focused (in-app toast covers it).
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = { title: "Notification", body: "", url: "/" };
      try {
        if (event.data) {
          Object.assign(data, JSON.parse(await event.data.text()));
        }
      } catch {
        /* keep defaults */
      }

      // Skip OS notification when the user is looking at the app
      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const appFocused = windowClients.some(
        (c) => c.url.startsWith(self.location.origin) && c.focused
      );
      if (appFocused) return;

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

// ---------------------------------------------------------------------------
// notificationclick — focus an existing window or open a new one.
// ---------------------------------------------------------------------------
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
