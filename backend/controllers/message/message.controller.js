import { ChatChannel } from "../../models/ChatChannel.js";
import { Message } from "../../models/Message.js";
import User from "../../models/User.js";

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const conversations = await ChatChannel.find({
      members: req.user._id
    })
      .populate("members", "first_name last_name email is_active")
      .populate("last_message")
      .populate("created_by", "first_name last_name")
      .sort({ last_message_at: -1 });

    // Format conversations for frontend
    const formatted = conversations.map(conv => {
      // For direct messages, get the other user's name
      let displayName = conv.name;
      let otherUser = null;
      
      if (conv.channel_type === "direct") {
        otherUser = conv.members.find(m => m._id.toString() !== req.user._id.toString());
        displayName = otherUser 
          ? `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim() || otherUser.email
          : "Unknown User";
      }

      return {
        _id: conv._id,
        name: displayName,
        channel_type: conv.channel_type,
        members: conv.members,
        otherUser,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at
      };
    });

    res.json({ conversations: formatted });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// Get or create a direct message conversation
export const getOrCreateDirectConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot create conversation with yourself" });
    }

    // Check if conversation already exists
    let conversation = await ChatChannel.findOne({
      channel_type: "direct",
      members: { $all: [req.user._id, userId], $size: 2 }
    }).populate("members", "first_name last_name email is_active");

    if (!conversation) {
      // Create new conversation
      conversation = await ChatChannel.create({
        channel_type: "direct",
        members: [req.user._id, userId],
        created_by: req.user._id
      });
      
      await conversation.populate("members", "first_name last_name email is_active");
    }

    // Get other user info
    const otherUser = conversation.members.find(m => m._id.toString() !== req.user._id.toString());
    const displayName = otherUser 
      ? `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim() || otherUser.email
      : "Unknown User";

    res.json({
      conversation: {
        _id: conversation._id,
        name: displayName,
        channel_type: conversation.channel_type,
        members: conversation.members,
        otherUser,
        created_at: conversation.created_at
      }
    });
  } catch (error) {
    console.error("Get/create conversation error:", error);
    res.status(500).json({ error: "Failed to get or create conversation" });
  }
};

// Create a group conversation
export const createGroupConversation = async (req, res) => {
  try {
    const { name, memberIds } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ error: "Name and members are required" });
    }

    // Include creator in members
    const allMembers = [...new Set([req.user._id.toString(), ...memberIds])];

    const conversation = await ChatChannel.create({
      channel_type: "group",
      name,
      members: allMembers,
      created_by: req.user._id
    });

    await conversation.populate("members", "first_name last_name email is_active");

    res.status(201).json({
      message: "Group created successfully",
      conversation
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is a member
    const conversation = await ChatChannel.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    let query = { channel_id: conversationId, deleted_at: null };
    
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate("sender_id", "first_name last_name email")
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    // Reverse to get chronological order
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, message_type = "text" } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify user is a member
    const conversation = await ChatChannel.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await Message.create({
      channel_id: conversationId,
      sender_id: req.user._id,
      content: content.trim(),
      message_type
    });

    // Update conversation's last message
    conversation.last_message = message._id;
    conversation.last_message_at = message.created_at;
    await conversation.save();

    await message.populate("sender_id", "first_name last_name email");

    res.status(201).json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Delete a message (soft delete)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      sender_id: req.user._id
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found or unauthorized" });
    }

    message.deleted_at = new Date();
    await message.save();

    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// Get available users to message
export const getAvailableUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      status: { $in: ["active", "pending"] } // Include active and pending users
    }).select("first_name last_name email user_type status");

    const formatted = users.map(user => ({
      _id: user._id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      email: user.email,
      user_type: user.user_type
    }));

    res.json({ users: formatted });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Mark conversation as read (for unread count)
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // This would typically update a read receipt or last_read timestamp
    // For now, just acknowledge the request
    res.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ error: "Failed to mark as read" });
  }
};
