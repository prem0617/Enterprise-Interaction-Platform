// controllers/directChat.controller.js
import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import { ChatChannel } from "../../models/ChatChannel.js";
import { ChannelMember } from "../../models/ChannelMember.js";
import { Message } from "../../models/Message.js";
import { getReceiverSocketId, io } from "../../socket/socketServer.js";

// Search users for direct chat
export const searchUsers = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    const currentUserId = req.userId;
    console.log(query);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Search users by name or email
    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      status: "active", // Only active users
      $or: [
        { first_name: { $regex: query, $options: "i" } },
        { last_name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("first_name last_name email user_type country")
      .limit(parseInt(limit));

    // Get employee details if user is employee
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        let employeeInfo = null;

        if (user.user_type === "employee") {
          const employee = await Employee.findOne({ user_id: user._id }).select(
            "department position employee_type"
          );
          employeeInfo = employee;
        }

        // Check if direct chat already exists
        const existingChat = await findExistingDirectChat(
          currentUserId,
          user._id
        );

        return {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          user_type: user.user_type,
          country: user.country,
          employee_info: employeeInfo,
          has_existing_chat: !!existingChat,
          existing_chat_id: existingChat?._id || null,
        };
      })
    );

    res.json({
      count: usersWithDetails.length,
      query,
      users: usersWithDetails,
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get user details by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    const user = await User.findById(userId).select(
      "first_name last_name email user_type country status"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "User is not active" });
    }

    let employeeInfo = null;
    if (user.user_type === "employee") {
      const employee = await Employee.findOne({ user_id: user._id })
        .select("department position employee_type")
        .populate("team_lead_id", "user_id")
        .populate({
          path: "team_lead_id",
          populate: {
            path: "user_id",
            select: "first_name last_name email",
          },
        });
      employeeInfo = employee;
    }

    // Check if direct chat already exists
    const existingChat = await findExistingDirectChat(currentUserId, userId);

    res.json({
      user: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        user_type: user.user_type,
        country: user.country,
        employee_info: employeeInfo,
      },
      has_existing_chat: !!existingChat,
      existing_chat_id: existingChat?._id || null,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Start or get existing direct chat
export const startDirectChat = async (req, res) => {
  try {
    const { user_id } = req.body;
    const currentUserId = req.userId;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    if (user_id === currentUserId) {
      return res
        .status(400)
        .json({ error: "Cannot create chat with yourself" });
    }

    // Check if target user exists and is active
    const targetUser = await User.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.status !== "active") {
      return res.status(403).json({ error: "User is not active" });
    }

    // Check if direct chat already exists
    const existingChat = await findExistingDirectChat(currentUserId, user_id);

    if (existingChat) {
      // Return existing chat with details
      const populatedChat = await ChatChannel.findById(
        existingChat._id
      ).populate("created_by", "first_name last_name email");

      const members = await ChannelMember.find({
        channel_id: existingChat._id,
      }).populate("user_id", "first_name last_name email user_type");

      return res.json({
        message: "Direct chat already exists",
        is_new: false,
        channel: populatedChat,
        members,
      });
    }

    // Create new direct chat channel
    const currentUser = await User.findById(currentUserId);
    const channelName = `${currentUser.first_name} & ${targetUser.first_name}`;

    const channel = new ChatChannel({
      channel_type: "direct",
      name: channelName,
      created_by: currentUserId,
      country_restriction: null,
    });

    await channel.save();

    // Add both users as members
    const member1 = new ChannelMember({
      channel_id: channel._id,
      user_id: currentUserId,
      role: "member",
    });

    const member2 = new ChannelMember({
      channel_id: channel._id,
      user_id: user_id,
      role: "member",
    });

    await Promise.all([member1.save(), member2.save()]);

    // Populate and return channel
    const populatedChat = await ChatChannel.findById(channel._id).populate(
      "created_by",
      "first_name last_name email"
    );

    const members = await ChannelMember.find({
      channel_id: channel._id,
    }).populate("user_id", "first_name last_name email user_type");

    const receiverSocketId = getReceiverSocketId(user_id.toString());

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("direct_chat_created", {
        _id: channel._id,
        other_user: {
          _id: currentUser._id,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          full_name: `${currentUser.first_name} ${currentUser.last_name}`,
          email: currentUser.email,
          user_type: currentUser.user_type,
        },
        unread_count: 0,
      });
    }

    res.status(201).json({
      message: "Direct chat created successfully",
      is_new: true,
      channel: populatedChat,
      members,
    });
  } catch (error) {
    console.error("Start direct chat error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all direct chats for current user
export const getDirectChats = async (req, res) => {
  try {
    const currentUserId = req.userId;
    console.log({ currentUserId });
    // Find all channel memberships for user
    const memberships = await ChannelMember.find({ user_id: currentUserId });
    const channelIds = memberships.map((m) => m.channel_id);

    // Get all direct channels
    const directChannels = await ChatChannel.find({
      _id: { $in: channelIds },
      channel_type: "direct",
    })
      .populate("created_by", "first_name last_name email")
      .sort({ created_at: -1 });

    // Get details for each chat
    const chatsWithDetails = await Promise.all(
      directChannels.map(async (channel) => {
        // Get all members
        const members = await ChannelMember.find({
          channel_id: channel._id,
        }).populate("user_id", "first_name last_name email user_type status");

        // Find the other user (not current user)
        const otherMember = members.find(
          (m) => m.user_id._id.toString() !== currentUserId
        );

        // Get last message

        const lastMessage = await Message.findOne({
          channel_id: channel._id,
          deleted_at: null,
        })
          .sort({ created_at: -1 })
          .populate("sender_id", "first_name last_name");

        // Get unread count
        const currentMembership = members.find(
          (m) => m.user_id._id.toString() === currentUserId
        );

        const unreadCount = await Message.countDocuments({
          channel_id: channel._id,
          created_at: { $gt: currentMembership.joined_at },
          sender_id: { $ne: currentUserId },
          deleted_at: null,
        });

        return {
          _id: channel._id,
          channel_type: channel.channel_type,
          name: channel.name,
          created_at: channel.created_at,
          other_user: otherMember
            ? {
                _id: otherMember.user_id._id,
                first_name: otherMember.user_id.first_name,
                last_name: otherMember.user_id.last_name,
                full_name: `${otherMember.user_id.first_name} ${otherMember.user_id.last_name}`,
                email: otherMember.user_id.email,
                user_type: otherMember.user_id.user_type,
                status: otherMember.user_id.status,
              }
            : null,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      })
    );

    res.json({
      count: chatsWithDetails.length,
      chats: chatsWithDetails,
    });
  } catch (error) {
    console.error("Get direct chats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to find existing direct chat between two users
async function findExistingDirectChat(userId1, userId2) {
  // Find channels where both users are members
  const user1Channels = await ChannelMember.find({ user_id: userId1 }).select(
    "channel_id"
  );
  const user1ChannelIds = user1Channels.map((m) => m.channel_id.toString());

  const user2Channels = await ChannelMember.find({ user_id: userId2 }).select(
    "channel_id"
  );
  const user2ChannelIds = user2Channels.map((m) => m.channel_id.toString());

  // Find common channels
  const commonChannelIds = user1ChannelIds.filter((id) =>
    user2ChannelIds.includes(id)
  );

  if (commonChannelIds.length === 0) {
    return null;
  }

  // Find direct channel among common channels
  for (const channelId of commonChannelIds) {
    const channel = await ChatChannel.findById(channelId);

    if (channel && channel.channel_type === "direct") {
      // Verify it's a 1-on-1 chat (exactly 2 members)
      const memberCount = await ChannelMember.countDocuments({
        channel_id: channelId,
      });

      if (memberCount === 2) {
        return channel;
      }
    }
  }

  return null;
}

// Get recent contacts (users you've chatted with)
export const getRecentContacts = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { limit = 10 } = req.query;

    // Get all direct chats
    const memberships = await ChannelMember.find({ user_id: currentUserId });
    const channelIds = memberships.map((m) => m.channel_id);

    const directChannels = await ChatChannel.find({
      _id: { $in: channelIds },
      channel_type: "direct",
    }).select("_id");

    const directChannelIds = directChannels.map((c) => c._id);

    // Get all members from these channels (excluding current user)
    const allMembers = await ChannelMember.find({
      channel_id: { $in: directChannelIds },
      user_id: { $ne: currentUserId },
    })
      .populate("user_id", "first_name last_name email user_type")
      .limit(parseInt(limit));

    // Remove duplicates and format
    const uniqueUsers = [];
    const seenUserIds = new Set();

    for (const member of allMembers) {
      const userId = member.user_id._id.toString();
      if (!seenUserIds.has(userId)) {
        seenUserIds.add(userId);
        uniqueUsers.push({
          _id: member.user_id._id,
          first_name: member.user_id.first_name,
          last_name: member.user_id.last_name,
          full_name: `${member.user_id.first_name} ${member.user_id.last_name}`,
          email: member.user_id.email,
          user_type: member.user_id.user_type,
        });
      }
    }

    res.json({
      count: uniqueUsers.length,
      contacts: uniqueUsers,
    });
  } catch (error) {
    console.error("Get recent contacts error:", error);
    res.status(500).json({ error: error.message });
  }
};

// // controllers/message.controller.js
// import { ChatChannel } from "../../models/ChatChannel.js";
// import { ChannelMember } from "../../models/ChannelMember.js";
// import Message from "../../models/Message.js";

// Get messages for a channel
export const getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const currentUserId = req.userId;
    const { limit = 50, before } = req.query;

    // Verify channel exists
    const channel = await ChatChannel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Verify user is a member of the channel
    const membership = await ChannelMember.findOne({
      channel_id: channelId,
      user_id: currentUserId,
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this channel" });
    }

    // Build query
    const query = {
      channel_id: channelId,
      deleted_at: null,
    };

    // Add pagination support
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    // Fetch messages
    const messages = await Message.find(query)
      .populate("sender_id", "first_name last_name email user_type")
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    // Reverse to get chronological order
    const sortedMessages = messages.reverse();

    // Mark messages as read (update last_read_at for the user)
    if (sortedMessages.length > 0) {
      const latestMessage = sortedMessages[sortedMessages.length - 1];
      await ChannelMember.findOneAndUpdate(
        { channel_id: channelId, user_id: currentUserId },
        { last_read_at: latestMessage.created_at }
      );
    }

    res.json({
      count: sortedMessages.length,
      channel_id: channelId,
      messages: sortedMessages.map((msg) => ({
        _id: msg._id,
        content: msg.content,
        sender_id: msg.sender_id._id,
        sender: {
          _id: msg.sender_id._id,
          first_name: msg.sender_id.first_name,
          last_name: msg.sender_id.last_name,
          full_name: `${msg.sender_id.first_name} ${msg.sender_id.last_name}`,
          email: msg.sender_id.email,
          user_type: msg.sender_id.user_type,
        },
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        is_edited: msg.updated_at > msg.created_at,
        is_own: msg.sender_id._id.toString() === currentUserId,
      })),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
    const currentUserId = req.userId;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify channel exists
    const channel = await ChatChannel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Verify user is a member of the channel
    const membership = await ChannelMember.findOne({
      channel_id: channelId,
      user_id: currentUserId,
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this channel" });
    }

    // Create message
    const message = new Message({
      channel_id: channelId,
      sender_id: currentUserId,
      content: content.trim(),
    });

    await message.save();

    // Update channel's last activity
    await ChatChannel.findByIdAndUpdate(channelId, {
      last_message_at: message.created_at,
    });

    // Populate sender details
    const populatedMessage = await Message.findById(message._id).populate(
      "sender_id",
      "first_name last_name email user_type"
    );

    const secondMember = await ChannelMember.findOne({
      channel_id: channelId,
      user_id: { $ne: currentUserId }, // not equal to current user
    });

    if (!secondMember) {
      return res.status(404).json({ error: "Second user not found" });
    }

    const secondUserId = secondMember.user_id;
    console.log({ secondUser: secondUserId.toString() });

    const secondUserSocketId = getReceiverSocketId(secondUserId.toString());
    console.log({ secondUserSocketId });

    if (secondUserSocketId) {
      io.to(secondUserSocketId).emit("new_message", {
        _id: populatedMessage._id,
        content: populatedMessage.content,
        sender_id: populatedMessage.sender_id._id,
        sender: {
          _id: populatedMessage.sender_id._id,
          first_name: populatedMessage.sender_id.first_name,
          last_name: populatedMessage.sender_id.last_name,
          full_name: `${populatedMessage.sender_id.first_name} ${populatedMessage.sender_id.last_name}`,
          email: populatedMessage.sender_id.email,
          user_type: populatedMessage.sender_id.user_type,
        },
        created_at: populatedMessage.created_at,
        updated_at: populatedMessage.updated_at,
        is_edited: false,
        is_own: false, // important for receiver
      });
    }

    res.status(201).json({
      message: "Message sent successfully",
      data: {
        _id: populatedMessage._id,
        content: populatedMessage.content,
        sender_id: populatedMessage.sender_id._id,
        sender: {
          _id: populatedMessage.sender_id._id,
          first_name: populatedMessage.sender_id.first_name,
          last_name: populatedMessage.sender_id.last_name,
          full_name: `${populatedMessage.sender_id.first_name} ${populatedMessage.sender_id.last_name}`,
          email: populatedMessage.sender_id.email,
          user_type: populatedMessage.sender_id.user_type,
        },
        created_at: populatedMessage.created_at,
        updated_at: populatedMessage.updated_at,
        is_edited: false,
        is_own: true,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const currentUserId = req.userId;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify user is the sender
    if (message.sender_id.toString() !== currentUserId) {
      return res
        .status(403)
        .json({ error: "You can only edit your own messages" });
    }

    // Check if message was deleted
    if (message.deleted_at) {
      return res.status(400).json({ error: "Cannot edit deleted message" });
    }

    // Update message
    message.content = content.trim();
    message.updated_at = new Date();
    await message.save();

    // Populate sender details
    const populatedMessage = await Message.findById(message._id).populate(
      "sender_id",
      "first_name last_name email user_type"
    );

    res.json({
      message: "Message updated successfully",
      data: {
        _id: populatedMessage._id,
        content: populatedMessage.content,
        sender_id: populatedMessage.sender_id._id,
        sender: {
          _id: populatedMessage.sender_id._id,
          first_name: populatedMessage.sender_id.first_name,
          last_name: populatedMessage.sender_id.last_name,
          full_name: `${populatedMessage.sender_id.first_name} ${populatedMessage.sender_id.last_name}`,
          email: populatedMessage.sender_id.email,
          user_type: populatedMessage.sender_id.user_type,
        },
        created_at: populatedMessage.created_at,
        updated_at: populatedMessage.updated_at,
        is_edited: true,
        is_own: true,
      },
    });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.userId;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify user is the sender
    if (message.sender_id.toString() !== currentUserId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own messages" });
    }

    // Check if already deleted
    if (message.deleted_at) {
      return res.status(400).json({ error: "Message already deleted" });
    }

    // Soft delete
    message.deleted_at = new Date();
    await message.save();

    res.json({
      message: "Message deleted successfully",
      message_id: messageId,
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get unread message count for a channel
export const getUnreadCount = async (req, res) => {
  try {
    const { channelId } = req.params;
    const currentUserId = req.userId;

    // Verify user is a member
    const membership = await ChannelMember.findOne({
      channel_id: channelId,
      user_id: currentUserId,
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this channel" });
    }

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      channel_id: channelId,
      created_at: { $gt: membership.last_read_at || membership.joined_at },
      sender_id: { $ne: currentUserId },
      deleted_at: null,
    });

    res.json({
      channel_id: channelId,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ error: error.message });
  }
};
