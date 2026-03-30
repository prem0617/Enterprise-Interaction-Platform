import { BACKEND_URL } from "../../config";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register SW, subscribe with VAPID, POST subscription to backend.
 * @returns {Promise<boolean>} Whether subscription was saved
 */
export async function subscribeUserPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  const vapidRes = await fetch(`${BACKEND_URL}/push/vapid-public`);
  const vapidJson = await vapidRes.json();
  if (!vapidJson.configured || !vapidJson.publicKey) {
    return false;
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidJson.publicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe();
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  const token = localStorage.getItem("token");
  if (!token) return false;

  const subJson = subscription.toJSON();
  const res = await fetch(`${BACKEND_URL}/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    }),
  });

  return res.ok;
}

export async function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}
