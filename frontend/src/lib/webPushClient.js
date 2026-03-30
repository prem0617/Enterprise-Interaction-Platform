import axios from "axios";
import { BACKEND_URL } from "../../config";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** Firefox is picky: pass a standalone ArrayBuffer, not a view into a larger buffer. */
function vapidKeyForSubscribe(vapidB64) {
  const raw = urlBase64ToUint8Array(vapidB64.trim());
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export async function enableWebPush(getAuthHeaders) {
  if (!isWebPushSupported()) {
    return { ok: false, reason: "This browser does not support background push notifications." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notification permission was not granted." };
  }

  let publicKeyRes;
  try {
    publicKeyRes = await axios.get(`${BACKEND_URL}/notifications/push/vapid-public-key`);
  } catch {
    return {
      ok: false,
      reason: "Server is not configured for Web Push (missing VAPID keys). Ask an admin to set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    };
  }

  const publicKey = String(publicKeyRes.data?.publicKey || "").trim();
  if (!publicKey) {
    return { ok: false, reason: "Server did not return a VAPID public key." };
  }

  const registration = await navigator.serviceWorker.register("/push-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });

  // Force-update the SW so the latest push-sw.js is fetched and activated.
  try {
    await registration.update();
  } catch {
    /* ignore */
  }

  // Wait until a service worker is active and controlling this page.
  // Chromium can leave a new SW in "installed/waiting" without this.
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
      // Safety timeout — don't block forever
      setTimeout(resolve, 3000);
    });
  }
  await navigator.serviceWorker.ready;

  // Unsubscribe any existing push subscription first — this ensures we get a
  // fresh subscription bound to the CURRENT VAPID key. Without this, Chromium
  // may silently reuse an old subscription created with a different key, causing
  // FCM to reject pushes with a 403 "VAPID credentials do not correspond".
  try {
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) await existingSub.unsubscribe();
  } catch {
    /* best effort */
  }

  let sub;
  try {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyForSubscribe(publicKey),
    });
  } catch (e) {
    const msg = e?.message || String(e);
    return {
      ok: false,
      reason:
        `Could not subscribe for push (${msg}). In Firefox: allow notifications for this site (lock icon → Permissions), avoid Private Windows, and ensure dom.push.enabled is on in about:config.`,
    };
  }

  const json = sub.toJSON();
  await axios.post(`${BACKEND_URL}/notifications/push/subscribe`, json, { headers: getAuthHeaders() });

  return { ok: true };
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export async function disableWebPush(getAuthHeaders) {
  if (!isWebPushSupported()) return { ok: false, reason: "Not supported" };

  const registration = await navigator.serviceWorker.getRegistration();
  const sub = registration ? await registration.pushManager.getSubscription() : null;
  const endpoint = sub?.endpoint;
  if (sub) await sub.unsubscribe();
  if (endpoint) {
    try {
      await axios.post(`${BACKEND_URL}/notifications/push/unsubscribe`, { endpoint }, { headers: getAuthHeaders() });
    } catch {
      /* still unsubscribed locally */
    }
  }
  return { ok: true };
}

export async function getLocalPushSubscription() {
  if (!isWebPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}
