import PushSubscription from "../../models/PushSubscription.js";
import {
  getVapidPublicKey,
  isPushConfigured,
  configureWebPush,
} from "../../services/pushService.js";
import { verifyCallPushToken } from "../../utils/pushActionToken.js";
import { getReceiverSocketId, io } from "../../socket/socketServer.js";

export const getVapidPublic = (req, res) => {
  configureWebPush();
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: "Push not configured", configured: false });
  }
  return res.json({ publicKey: key, configured: true });
};

export const subscribe = async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ error: "Push not configured on server" });
    }
    const userId = req.userId;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "endpoint and keys (p256dh, auth) required" });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user_id: userId,
        endpoint,
        keys_p256dh: keys.p256dh,
        keys_auth: keys.auth,
        user_agent: req.headers["user-agent"] || "",
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("[PUSH] subscribe error:", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const userId = req.userId;
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ user_id: userId, endpoint });
    } else {
      await PushSubscription.deleteMany({ user_id: userId });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("[PUSH] unsubscribe error:", err);
    return res.status(500).json({ error: "Failed to remove subscription" });
  }
};

/** Verify call token after user opens app from push (Accept). */
export const verifyCallToken = async (req, res) => {
  try {
    const { token } = req.body;
    const payload = verifyCallPushToken(token);
    if (!payload) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    const User = (await import("../../models/User.js")).default;
    const fromUser = await User.findById(payload.fromUserId).select("first_name last_name");
    const fromUserName = fromUser
      ? `${fromUser.first_name || ""} ${fromUser.last_name || ""}`.trim() || "Someone"
      : "Someone";
    return res.json({
      ok: true,
      fromUserId: payload.fromUserId,
      fromUserName,
      callType: payload.callType,
    });
  } catch (err) {
    console.error("[PUSH] verifyCallToken error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};

/**
 * Decline call from service worker without auth. Accept path opens the app instead.
 */
export const postCallResponse = async (req, res) => {
  try {
    const { token, accept } = req.body;
    const payload = verifyCallPushToken(token);
    if (!payload) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    if (accept === true) {
      return res.json({ ok: true });
    }

    const callerId = String(payload.fromUserId);
    const calleeId = String(payload.toUserId);
    const socketId = getReceiverSocketId(callerId);
    if (socketId && io) {
      if (payload.callType === "video") {
        io.to(socketId).emit("video-call-rejected", { fromUserId: calleeId });
      } else {
        io.to(socketId).emit("call-rejected", { fromUserId: calleeId });
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[PUSH] postCallResponse error:", err);
    return res.status(500).json({ error: "Failed" });
  }
};
