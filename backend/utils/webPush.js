import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let configured = false;

export function initWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = (process.env.VAPID_SUBJECT || "mailto:noreply@localhost").trim();
  if (!publicKey || !privateKey) {
    console.warn("[web-push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — background push disabled");
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  console.log("[web-push] VAPID configured");
}

export function isWebPushConfigured() {
  return configured;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Send Web Push to all stored browser subscriptions for a user.
 * Removes subscriptions that the push service reports as gone (410/404).
 */
export async function sendWebPushToUser(userId, { title, body = "", url = "/", tag = "eip" }) {
  if (!configured || !userId) return;
  const uid = userId.toString();
  const subs = await PushSubscription.find({ user_id: uid }).lean();
  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: title || "Notification",
    body,
    url,
    tag: `${tag}-${Date.now()}`,
  });

  const AES_128 = webpush.supportedContentEncodings.AES_128_GCM;
  const AES_GCM = webpush.supportedContentEncodings.AES_GCM;

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    // Firefox / Mozilla push often expects aesgcm; Chromium prefers aes128gcm. Try both on failure.
    const mozilla = /mozilla\.com|services\.mozilla/i.test(sub.endpoint || "");
    const order = mozilla ? [AES_GCM, AES_128] : [AES_128, AES_GCM];

    let lastErr;
    for (let i = 0; i < order.length; i++) {
      const contentEncoding = order[i];
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 86_400,
          contentEncoding,
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        const code = err?.statusCode;
        const maybeEncoding = code === 400 || code === 406 || code === 415;
        if (!maybeEncoding || i === order.length - 1) break;
      }
    }

    if (!lastErr) continue;

    const code = lastErr?.statusCode;
    if (code === 404 || code === 410) {
      await PushSubscription.deleteOne({ _id: sub._id });
    } else {
      console.warn("[web-push] send failed:", lastErr?.message || lastErr);
    }
  }
}
