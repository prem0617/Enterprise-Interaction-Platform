import OpenAI from "openai";
import { Message } from "../../models/Message.js";
import { ChannelMember } from "../../models/ChannelMember.js";
import { ChatChannel } from "../../models/ChatChannel.js";
import Document from "../../models/Document.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { channel_id } = req.params;

    // Verify the user is a member of the channel
    const membership = await ChannelMember.findOne({
      channel_id,
      user_id: userId,
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this channel" });
    }

    // Verify channel exists
    const channel = await ChatChannel.findById(channel_id);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Fetch all messages in the channel that the user has NOT seen
    // A message is "unseen" if userId is not present in the seen_by array
    // and the message was not sent by the user themselves
    const unseenMessages = await Message.find({
      channel_id,
      sender_id: { $ne: userId },
      deleted_at: null,
      "seen_by.user_id": { $nin: [userId] },
    })
      .sort({ created_at: 1 })
      .populate("sender_id", "first_name last_name email")
      .lean();

    // If nothing is unseen, fallback to summarizing recent messages so the user still gets a useful summary
    if (unseenMessages.length === 0) {
      const recent = await Message.find({
        channel_id,
        deleted_at: null,
      })
        .sort({ created_at: -1 })
        .limit(40)
        .populate("sender_id", "first_name last_name email")
        .lean();

      if (!recent?.length) {
        return res.status(200).json({
          summary: null,
          message: "No messages found in this channel.",
          unseen_count: 0,
          scope: "recent",
          channel: {
            id: channel._id,
            name: channel.name ?? null,
            channel_type: channel.channel_type,
          },
        });
      }

      const recentChrono = recent.reverse();
      const transcript = recentChrono
        .map((msg) => {
          const senderName = msg.sender_id
            ? `${msg.sender_id.first_name ?? ""} ${msg.sender_id.last_name ?? ""}`.trim()
            : "Unknown User";

          const timestamp = new Date(msg.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          if (msg.message_type === "file") {
            return `[${timestamp}] ${senderName}: [Shared a file: ${msg.file_name ?? "file"}]`;
          }

          if (msg.message_type === "system") {
            return `[${timestamp}] System: ${msg.content}`;
          }

          return `[${timestamp}] ${senderName}: ${msg.content}`;
        })
        .join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that summarizes chat conversations.
Given a transcript of recent messages from a chat channel, provide a concise and clear summary that:
- Highlights the key topics discussed
- Mentions any important decisions, action items, or requests (if any)
- Notes any files or resources shared
- Keeps the summary brief (3–6 sentences max)
- Uses a neutral, professional tone`,
          },
          {
            role: "user",
            content: `Please summarize the following recent messages from a chat channel:\n\n${transcript}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.4,
      });

      const summary = completion.choices[0]?.message?.content?.trim();
      return res.status(200).json({
        summary,
        unseen_count: 0,
        scope: "recent",
        channel: {
          id: channel._id,
          name: channel.name ?? null,
          channel_type: channel.channel_type,
        },
      });
    }

    // Build a readable transcript for the LLM
    const transcript = unseenMessages
      .map((msg) => {
        const senderName = msg.sender_id
          ? `${msg.sender_id.first_name ?? ""} ${msg.sender_id.last_name ?? ""}`.trim()
          : "Unknown User";

        const timestamp = new Date(msg.created_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        if (msg.message_type === "file") {
          return `[${timestamp}] ${senderName}: [Shared a file: ${msg.file_name ?? "file"}]`;
        }

        if (msg.message_type === "system") {
          return `[${timestamp}] System: ${msg.content}`;
        }

        return `[${timestamp}] ${senderName}: ${msg.content}`;
      })
      .join("\n");

    // Prompt the LLM to generate a concise summary
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that summarizes chat conversations. 
Given a transcript of messages a user has not yet read, provide a concise and clear summary that:
- Highlights the key topics discussed
- Mentions any important decisions, action items, or requests directed at the user (if any)
- Notes any files or resources shared
- Keeps the summary brief (3–6 sentences max)
- Uses a neutral, professional tone`,
        },
        {
          role: "user",
          content: `Please summarize the following unseen messages from a chat channel:\n\n${transcript}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    return res.status(200).json({
      summary,
      unseen_count: unseenMessages.length,
      scope: "unseen",
      channel: {
        id: channel._id,
        name: channel.name ?? null,
        channel_type: channel.channel_type,
      },
    });
  } catch (error) {
    console.error("Chat summary error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const documentQA = async (req, res) => {
  try {
    const { document_id } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const doc = await Document.findById(document_id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Strip HTML tags for cleaner context
    const textContent = (doc.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000); // Limit context length

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful document assistant. Answer questions about the following document content accurately and concisely. If the answer cannot be found in the document, say so clearly. Use markdown formatting for better readability.`,
        },
        {
          role: "user",
          content: `Document title: "${doc.title || "Untitled"}"\n\nDocument content:\n${textContent}\n\nQuestion: ${question.trim()}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Document QA error:", error);
    res.status(500).json({ error: error.message });
  }
};