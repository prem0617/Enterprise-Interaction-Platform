import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";
import FcmToken from "../models/FcmToken.js";
import admin from "firebase-admin";
import fs from "node:fs";

let vapidConfigured = false;
let fcmConfigured = false;

function initFcmIfNeeded() {
  if (fcmConfigured) return true;
  try {
    if (admin.apps?.length) {
      fcmConfigured = true;
      return true;
    }
    const json = process.env.FCM_SERVICE_ACCOUNT_JSON;
    const path = process.env.FCM_SERVICE_ACCOUNT_PATH;
    let serviceAccount = null;

    if (json) {
      serviceAccount = JSON.parse(json);
    } else if (path) {
      const raw = fs.readFileSync(path, "utf8");
      serviceAccount = JSON.parse(raw);
    } else {
      console.warn("[PUSH][FCM] FCM_SERVICE_ACCOUNT_JSON not set");
      return false;
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    fcmConfigured = true;
    return true;
  } catch (err) {
    console.error("[PUSH][FCM] init failed:", err?.message || err);
    return false;
  }
}

export function configureWebPush() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:dev@localhost";
  if (!publicKey || !privateKey) {
    console.warn("[PUSH] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — web push disabled");
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function isPushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** Public URL of the web app (notification click targets). */
export function getPublicAppUrl() {
  return (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
}

/** Public base for API (e.g. http://localhost:8000) — used by service worker for call-response. */
export function getPublicApiBase() {
  return (process.env.PUBLIC_API_BASE || "http://localhost:8000").replace(/\/$/, "");
}

/**
 * @param {string} userId
 * @param {{ title: string, body?: string, url?: string, tag?: string, actions?: array, data?: object }} n
 */
export async function sendPushToUser(userId, n) {
  const uid = String(userId);

  // By default, deliver using Web Push (VAPID + PushSubscription) rather than FCM.
  // Set `PUSH_USE_FCM=true` on the backend to re-enable FCM delivery.
  const useFcm = process.env.PUSH_USE_FCM === "true";
  if (useFcm) {
    // ─── FCM (optional) ───
    try {
      const fcmTokens = await FcmToken.find({ user_id: uid }).select("token");
      if (fcmTokens?.length) {
        const ok = initFcmIfNeeded();
        if (ok) {
          const tokens = fcmTokens.map((t) => t.token).filter(Boolean);
          console.log("[PUSH][FCM] sending to", { userId: uid, tokens: tokens.length });
          const title = String(n.title || "Enterprise Platform");
          const body = String(n.body || "");
          const data = {
            title,
            body,
            url: String(n.url || getPublicAppUrl()),
            tag: String(n.tag || "eip-default"),
            apiBase: String(getPublicApiBase()),
            ...(n.data || {}),
          };

          if (tokens.length === 1) {
            await admin.messaging().send({
              token: tokens[0],
              notification: { title, body },
              data,
            });
          } else {
            const messaging = admin.messaging();
            if (typeof messaging.sendEachForMulticast === "function") {
              await messaging.sendEachForMulticast({
                tokens,
                notification: { title, body },
                data,
              });
            } else {
              // Fallback: send individually
              await Promise.all(
                tokens.map((t) =>
                  messaging.send({
                    token: t,
                    notification: { title, body },
                    data,
                  })
                )
              );
            }
          }
          return;
        }
      }
    } catch (err) {
      console.error("[PUSH][FCM] send failed:", { userId: uid, message: err?.message || err });
    }
  }

  configureWebPush();
  if (!isPushConfigured() || !vapidConfigured) return;

  const subs = await PushSubscription.find({ user_id: uid });
  if (!subs.length) return;

  console.log("[PUSH] sendPushToUser verification", {
    userId: uid,
    subsFound: subs.length,
    vapidConfigured: vapidConfigured ? "yes" : "no",
    vapidKeysPresent:
      Boolean(process.env.VAPID_PUBLIC_KEY) && Boolean(process.env.VAPID_PRIVATE_KEY),
    subscriptionKeyStats: {
      missingP256dh: subs.filter((s) => !s.keys_p256dh).length,
      missingAuth: subs.filter((s) => !s.keys_auth).length,
    },
  });

  const payload = JSON.stringify({
    title: n.title,
    body: n.body || "",
    url: n.url || getPublicAppUrl(),
    tag: n.tag || "eip-default",
    actions: n.actions || [],
    data: {
      ...(n.data || {}),
      url: n.url || getPublicAppUrl(),
      apiBase: getPublicApiBase(),
    },
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        if (!sub.keys_p256dh || !sub.keys_auth) {
          // Older/bad records might exist in DB without keys; remove them so
          // we don't repeatedly fail sending notifications.
          console.warn("[PUSH] deleting invalid subscription", {
            userId: uid,
            endpoint: String(sub.endpoint || "").slice(0, 40) + "…",
          });
          await PushSubscription.deleteOne({ _id: sub._id });
          return;
        }
        console.log("[PUSH] sending notification", {
          userId: uid,
          endpoint: String(sub.endpoint || "").slice(0, 60) + "…",
          tag: n.tag || "eip-default",
        });
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload
        );
        console.log("[PUSH] notification sent", {
          userId: uid,
          endpoint: String(sub.endpoint || "").slice(0, 60) + "…",
        });
      } catch (err) {
        const code = err.statusCode;
        if (code === 404 || code === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("[PUSH] send error:", {
            userId: uid,
            endpoint: String(sub.endpoint || "").slice(0, 60) + "…",
            message: err.message,
            statusCode: err.statusCode,
          });
        }
      }
    })
  );
}

/** Notify admins (active, user_type admin). */
export async function sendPushToAllAdmins(notification) {
  const User = (await import("../models/User.js")).default;
  const admins = await User.find({ user_type: "admin", status: "active" }).select("_id").lean();
  await Promise.all(admins.map((a) => sendPushToUser(a._id, notification)));
}
