import PushSubscription from "../../models/PushSubscription.js";
import { getVapidPublicKey, isWebPushConfigured } from "../../utils/webPush.js";

export const getVapidPublicKeyHandler = (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: "Web Push is not configured on the server" });
  }
  res.json({ publicKey: key });
};

export const subscribePush = async (req, res) => {
  try {
    if (!isWebPushConfigured()) {
      return res.status(503).json({ error: "Web Push is not configured on the server" });
    }
    const { endpoint, keys } = req.body || {};
    const p256dh = keys?.p256dh || req.body?.p256dh || req.body?.keys_p256dh;
    const auth = keys?.auth || req.body?.auth || req.body?.keys_auth;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }

    // Upsert — atomic replace so concurrent calls from the same browser
    // (mount re-sync + explicit enable) don't race into a duplicate-key error.
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user_id: req.userId, endpoint, p256dh, auth },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("subscribePush error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
};

/**
 * Called by the push service worker's `pushsubscriptionchange` handler when
 * the browser silently rotates a push subscription (FCM token refresh, etc.).
 * No JWT auth is required — possession of the old endpoint URL is the
 * credential, because only the browser that held that subscription knows it.
 */
export const rotateSubscription = async (req, res) => {
  try {
    const { oldEndpoint, endpoint, keys } = req.body || {};
    const p256dh = keys?.p256dh || req.body?.p256dh;
    const auth = keys?.auth || req.body?.auth;

    if (!oldEndpoint || !endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the existing record by old endpoint and swap in the new subscription.
    const updated = await PushSubscription.findOneAndUpdate(
      { endpoint: oldEndpoint },
      { endpoint, p256dh, auth },
      { new: true }
    );

    if (!updated) {
      // Old subscription not in DB (may have been cleaned up) — nothing to rotate.
      return res.status(404).json({ error: "Original subscription not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("rotateSubscription error:", err);
    res.status(500).json({ error: "Failed to rotate subscription" });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint required" });
    }
    await PushSubscription.deleteOne({ endpoint, user_id: req.userId });
    res.json({ success: true });
  } catch (err) {
    console.error("unsubscribePush error:", err);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
};
