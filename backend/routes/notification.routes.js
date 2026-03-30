import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from "../controllers/notification/notification.controller.js";
import { sendBroadcast } from "../controllers/notification/broadcast.controller.js";
import {
  getVapidPublicKeyHandler,
  subscribePush,
  unsubscribePush,
  rotateSubscription,
} from "../controllers/notification/pushSubscription.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/push/vapid-public-key", getVapidPublicKeyHandler);
// No auth — old endpoint URL acts as credential (only the holding browser knows it)
router.post("/push/rotate-subscription", rotateSubscription);

router.use(verifyToken);

router.post("/push/subscribe", subscribePush);
router.post("/push/unsubscribe", unsubscribePush);
router.post("/broadcast", isAdmin, sendBroadcast);
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
