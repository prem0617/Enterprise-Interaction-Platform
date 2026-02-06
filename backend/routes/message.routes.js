import express from "express";
import {
  getConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  deleteMessage,
  getAvailableUsers,
  markAsRead
} from "../controllers/message/message.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Conversations
router.get("/conversations", getConversations);
router.post("/conversations/direct", getOrCreateDirectConversation);
router.post("/conversations/group", createGroupConversation);
router.post("/conversations/:conversationId/read", markAsRead);

// Messages
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.delete("/messages/:messageId", deleteMessage);

// Users
router.get("/users", getAvailableUsers);

export default router;
