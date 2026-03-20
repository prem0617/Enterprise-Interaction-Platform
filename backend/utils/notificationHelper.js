import Notification from "../models/Notification.js";
import { getReceiverSocketId, io } from "../socket/socketServer.js";
import { isWebPushConfigured, sendWebPushToUser } from "./webPush.js";

/**
 * Create a notification and push it to the recipient via Socket.IO.
 * @param {Object} opts
 * @param {string} opts.recipientId   - Target user ID
 * @param {string} opts.type          - Notification type enum
 * @param {string} opts.priority      - low | medium | high | urgent
 * @param {string} opts.title         - Short heading
 * @param {string} [opts.body]        - Longer description
 * @param {string} [opts.actorId]     - User who caused the notification
 * @param {{ kind: string, id: string }} [opts.reference] - Link to resource
 * @returns {Promise<Object>} saved notification
 */
export async function createNotification({
  recipientId,
  type,
  priority = "medium",
  title,
  body = "",
  actorId = null,
  reference = null,
}) {
  try {
    const notification = await Notification.create({
      recipient_id: recipientId,
      type,
      priority,
      title,
      body,
      actor_id: actorId,
      reference,
    });

    const populated = await Notification.findById(notification._id)
      .populate("actor_id", "first_name last_name email profile_picture")
      .lean();

    // Push via socket
    const socketId = getReceiverSocketId(recipientId.toString());
    if (socketId && io) {
      io.to(socketId).emit("notification", populated);
    }

    // Web Push (works when tab is closed / browser in background)
    if (populated && isWebPushConfigured()) {
      void sendWebPushToUser(recipientId, {
        title: populated.title,
        body: populated.body || "",
        url: "/",
        tag: `eip-${populated._id}`,
      });
    }

    return populated;
  } catch (err) {
    console.error("createNotification error (non-fatal):", err.message);
    return null;
  }
}

/**
 * Send notifications to multiple recipients.
 */
export async function createBulkNotifications(recipientIds, opts) {
  const results = [];
  for (const rid of recipientIds) {
    const n = await createNotification({ ...opts, recipientId: rid });
    if (n) results.push(n);
  }
  return results;
}
