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

    await PushSubscription.deleteMany({ endpoint });
    await PushSubscription.create({
      user_id: req.userId,
      endpoint,
      p256dh,
      auth,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("subscribePush error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
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
