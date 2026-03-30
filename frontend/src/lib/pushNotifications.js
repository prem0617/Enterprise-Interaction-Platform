import { BACKEND_URL } from "../../config";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// FCM client config (public values)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBn6oyGwcMmkxfAN5oDQYUkazm-7TKiHO0",
  authDomain: "notification-25684.firebaseapp.com",
  projectId: "notification-25684",
  storageBucket: "notification-25684.firebasestorage.app",
  messagingSenderId: "572073347602",
  appId: "1:572073347602:web:a23cfb9769182f1759a6cb",
};

const FIREBASE_VAPID_KEY =
  "BO9faYhBz9d_XZljy1qc_qE4pX09zy0SNUtAMynYYAApEIZrQxwSjVOIgSQYY3m7fVQyTCq5yl7bucLdWV55Fqc";

let messagingSetupDone = false;
function initFirebaseApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp(FIREBASE_CONFIG);
}

/**
 * Register SW, subscribe with VAPID, POST subscription to backend.
 * @returns {Promise<boolean>} Whether subscription was saved
 */
export async function subscribeUserPush() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/" }
  );
  await navigator.serviceWorker.ready;

  const token = localStorage.getItem("token");
  if (!token) return false;

  const app = initFirebaseApp();
  const messaging = getMessaging(app);

  const fcmToken = await getToken(messaging, {
    vapidKey: FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!fcmToken) return false;

  console.log("[FCM] got token", {
    length: String(fcmToken).length,
    startsWith: String(fcmToken).slice(0, 10),
  });

  if (!messagingSetupDone) {
    messagingSetupDone = true;
    try {
      onMessage(messaging, (payload) => {
        const title =
          payload?.notification?.title || payload?.data?.title || "Enterprise Platform";
        const body = payload?.notification?.body || payload?.data?.body || "";
        const tag = payload?.data?.tag || "eip-fcm";

        console.log("[FCM] onMessage foreground payload:", {
          title,
          bodyLen: String(body).length,
          tag,
        });

        // Show a browser notification while user is on the platform.
        // (FCM onBackgroundMessage won't fire in foreground.)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            // eslint-disable-next-line no-new
            new Notification(title, { body, tag });
          } catch (e) {
            console.warn("[FCM] foreground Notification failed:", e?.message || e);
          }
        }
      });
    } catch {
      // ignore (foreground listener may fail on some browsers)
    }
  }

  const res = await fetch(`${BACKEND_URL}/push/subscribe-fcm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ token: fcmToken }),
  });

  return res.ok;
}

export async function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof Notification !== "undefined"
  );
}
