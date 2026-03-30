import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let vapidConfigured = false;

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
  configureWebPush();
  if (!isPushConfigured() || !vapidConfigured) return;

  const uid = String(userId);
  const subs = await PushSubscription.find({ user_id: uid });
  if (!subs.length) return;

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
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload
        );
      } catch (err) {
        const code = err.statusCode;
        if (code === 404 || code === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("[PUSH] send error:", err.message);
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
