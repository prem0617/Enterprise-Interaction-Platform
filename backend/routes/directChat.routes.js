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
  getUnreadCount,
} from "../controllers/chat/direct_message.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Search users for starting direct chat
router.get("/search", searchUsers);

// Get user details by ID
router.get("/users/:userId", getUserById);

// Start or get existing direct chat
router.post("/start", startDirectChat);

// Get all direct chats for current user
router.get("/list", getDirectChats);

// Get recent contacts
router.get("/contacts", getRecentContacts);

// Message routes
// Get messages for a channel
router.get("/channels/:channelId/messages", getMessages);

// Send a message to a channel
router.post("/channels/:channelId/messages", sendMessage);

// Edit a message
router.put("/messages/:messageId", editMessage);

// Delete a message
router.delete("/messages/:messageId", deleteMessage);

// Get unread count for a channel
router.get("/channels/:channelId/unread", getUnreadCount);

export default router;
