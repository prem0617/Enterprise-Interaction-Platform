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
 * Fetch the VAPID public key from the backend.
 * Returns the key string or null on failure.
 */
async function fetchVapidPublicKey() {
  try {
    const res = await axios.get(`${BACKEND_URL}/notifications/push/vapid-public-key`);
    return String(res.data?.publicKey || "").trim() || null;
  } catch {
    return null;
  }
}

/**
 * Send VAPID key + API base URL into the service worker's Cache API so the SW
 * can re-subscribe on its own when a `pushsubscriptionchange` event fires
 * (Firefox, Chrome 138+) even without an open page/auth token.
 */
async function savePushConfigToSW(vapidKey) {
  try {
    const sw = await navigator.serviceWorker.ready;
    if (sw.active) {
      sw.active.postMessage({
        type: "SAVE_PUSH_CONFIG",
        vapidKey,
        apiBase: BACKEND_URL,
      });
    }
  } catch {
    /* best effort */
  }
}

/**
 * Register (or re-register) the push service worker and wait until it is
 * active and controlling this page.
 */
async function registerAndActivateSW() {
  const registration = await navigator.serviceWorker.register("/push-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });

  try { await registration.update(); } catch { /* ignore */ }

  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
      setTimeout(resolve, 3000);
    });
  }
  await navigator.serviceWorker.ready;
  return registration;
}

/**
 * Silently restore a push subscription on page load when notification
 * permission is already "granted" but the browser (e.g. Helium, Brave with
 * aggressive privacy settings) has cleared the service worker or push
 * subscription between sessions.
 *
 * - No permission prompt is shown (permission was already granted).
 * - The existing subscription is reused if still valid; otherwise a fresh one
 *   is created and synced to the backend.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
export async function restoreWebPush(getAuthHeaders) {
  if (!isWebPushSupported()) return { ok: false, reason: "not-supported" };
  if (Notification.permission !== "granted") return { ok: false, reason: "permission-not-granted" };

  try {
    const publicKey = await fetchVapidPublicKey();
    if (!publicKey) return { ok: false, reason: "vapid-fetch-failed" };

    const registration = await registerAndActivateSW();

    let sub = await registration.pushManager.getSubscription();

    if (!sub) {
      // Subscription was cleared by the browser — recreate it silently.
      // No user gesture needed because permission is already "granted".
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyForSubscribe(publicKey),
      });
    }

    const json = sub.toJSON();
    if (json?.endpoint && json?.keys?.p256dh && json?.keys?.auth) {
      await axios.post(
        `${BACKEND_URL}/notifications/push/subscribe`,
        json,
        { headers: getAuthHeaders() }
      );
    }

    // Save config into SW cache so pushsubscriptionchange can re-subscribe
    // without the main thread (works even with no open windows).
    await savePushConfigToSW(publicKey);

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || "unknown" };
  }
}

/**
 * Full enable flow — requests notification permission then subscribes.
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

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return {
      ok: false,
      reason: "Server is not configured for Web Push (missing VAPID keys). Ask an admin to set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    };
  }

  const registration = await registerAndActivateSW();

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
      reason: `Could not subscribe for push (${msg}). In Firefox: allow notifications for this site (lock icon → Permissions), avoid Private Windows, and ensure dom.push.enabled is on in about:config.`,
    };
  }

  const json = sub.toJSON();
  await axios.post(`${BACKEND_URL}/notifications/push/subscribe`, json, { headers: getAuthHeaders() });

  // Save config into SW cache so pushsubscriptionchange can re-subscribe
  // without the main thread (works even with no open windows).
  await savePushConfigToSW(publicKey);

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
