import { Message } from "../models/Message.js";
import { ChatChannel } from "../models/ChatChannel.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const setupMessageSocket = (io) => {
  // Create a namespace for messaging
  const messageIo = io.of("/messages");

  // Auth middleware
  messageIo.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      
      // Get user details
      const user = await User.findById(decoded.id).select("first_name last_name email");
      if (user) {
        socket.userName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;
        socket.userEmail = user.email;
      }
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  messageIo.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected to messages`);

    // Join user's personal room for receiving messages
    socket.join(`user:${socket.userId}`);

    // Join a conversation room
    socket.on("join-conversation", async (conversationId) => {
      try {
        // Verify user is a member
        const conversation = await ChatChannel.findOne({
          _id: conversationId,
          members: socket.userId
        });

        if (conversation) {
          socket.join(`conversation:${conversationId}`);
          socket.emit("joined-conversation", { conversationId });
        }
      } catch (error) {
        console.error("Join conversation error:", error);
      }
    });

    // Leave a conversation room
    socket.on("leave-conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send a message
    socket.on("send-message", async (data) => {
      const { conversationId, content, message_type = "text" } = data;

      if (!conversationId || !content?.trim()) return;

      try {
        // Verify user is a member
        const conversation = await ChatChannel.findOne({
          _id: conversationId,
          members: socket.userId
        });

        if (!conversation) return;

        // Create message
        const message = await Message.create({
          channel_id: conversationId,
          sender_id: socket.userId,
          content: content.trim(),
          message_type
        });

        // Update conversation
        conversation.last_message = message._id;
        conversation.last_message_at = message.created_at;
        await conversation.save();

        // Populate sender info
        await message.populate("sender_id", "first_name last_name email");

        // Emit to all users in the conversation
        messageIo.to(`conversation:${conversationId}`).emit("new-message", {
          conversationId,
          message: {
            _id: message._id,
            channel_id: message.channel_id,
            sender_id: message.sender_id,
            content: message.content,
            message_type: message.message_type,
            created_at: message.created_at
          }
        });

        // Also notify other members who might not be in the conversation room
        conversation.members.forEach(memberId => {
          if (memberId.toString() !== socket.userId) {
            messageIo.to(`user:${memberId}`).emit("conversation-updated", {
              conversationId,
              lastMessage: message.content,
              lastMessageAt: message.created_at,
              senderId: socket.userId,
              senderName: socket.userName
            });
          }
        });
      } catch (error) {
        console.error("Send message socket error:", error);
        socket.emit("message-error", { error: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        conversationId,
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on("stop-typing", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("user-stop-typing", {
        conversationId,
        userId: socket.userId
      });
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected from messages`);
    });
  });

  return messageIo;
};
