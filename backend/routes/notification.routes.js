import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from "../controllers/notification/notification.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
