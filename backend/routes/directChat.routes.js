import express from "express";
import {
  searchUsers,
  getUserById,
  startDirectChat,
  getDirectChats,
  getRecentContacts,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  clearConversation,
  getUnreadCount,
  markMessagesAsSeen,
  getMessageSeenStatus,
  getUnreadMessageCount,
} from "../controllers/chat/direct_message.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/search", searchUsers);
router.get("/users/:userId", getUserById);
router.post("/start", startDirectChat);
router.get("/list", getDirectChats);
router.get("/contacts", getRecentContacts);

// Message routes
router.get("/channels/:channelId/messages", getMessages);
router.post("/channels/:channelId/messages", sendMessage);
router.put("/messages/:messageId", editMessage);
router.delete("/messages/:messageId", deleteMessage);
router.delete("/channels/:channelId/clear", clearConversation);
router.get("/channels/:channelId/unread", getUnreadCount);

// NEW: Seen/Read receipt routes
router.post("/channels/:channelId/messages/seen", markMessagesAsSeen);
router.get("/messages/:messageId/seen-status", getMessageSeenStatus);
router.get("/channels/:channelId/unread-count", getUnreadMessageCount);

export default router;
