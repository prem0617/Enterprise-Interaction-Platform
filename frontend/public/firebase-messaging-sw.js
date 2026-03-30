/* eslint-disable no-undef */
/* global self */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBn6oyGwcMmkxfAN5oDQYUkazm-7TKiHO0",
  authDomain: "notification-25684.firebaseapp.com",
  projectId: "notification-25684",
  storageBucket: "notification-25684.firebasestorage.app",
  messagingSenderId: "572073347602",
  appId: "1:572073347602:web:a23cfb9769182f1759a6cb",
};

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

function openOrFocusUrl(url) {
  const target = url || "/";
  return self.clients
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
            if (c.navigate) c.navigate(target);
            return c.focus();
          }
        } catch (_) {}
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    });
}

messaging.onBackgroundMessage((payload) => {
  // eslint-disable-next-line no-console
  console.log("[FCM SW] onBackgroundMessage", {
    title: payload?.notification?.title || payload?.data?.title,
    tag: payload?.data?.tag,
  });

  // If FCM already included a notification payload, Chrome/Edge may display it
  // automatically. Avoid double notifications.
  if (payload?.notification) {
    return;
  }

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Enterprise Platform";
  const body =
    payload?.notification?.body || payload?.data?.body || "";
  const url = payload?.data?.url || "/";
  const tag = payload?.data?.tag || "eip-fcm";

  const options = {
    body,
    tag,
    data: { url },
    icon: "/vite.svg",
  };

  return self.registration.showNotification(title, options).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[FCM SW] showNotification failed:", err);
  });
});

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const d = n.data || {};
  n.close();
  event.waitUntil(openOrFocusUrl(d.url || "/"));
});

