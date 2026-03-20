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

    if (unseenMessages.length === 0) {
      return res.status(200).json({
        summary: null,
        message: "No unseen messages found in this channel.",
        unseen_count: 0,
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

/** Flatten stored document content to plain text for the AI context window */
function slideDeckToPlainText(raw) {
  try {
    const p = JSON.parse(raw);
    const slides = p.slides || (Array.isArray(p) ? p : []);
    if (!Array.isArray(slides)) return "";
    const text = slides
      .map((s) => {
        if (s?.elements && Array.isArray(s.elements)) {
          return s.elements
            .filter((e) => e?.type === "text" && e.text)
            .map((e) => e.text)
            .join("\n");
        }
        return [s.title, s.body, s.notes, s.content].filter(Boolean).join("\n");
      })
      .join("\n\n");
    return text.replace(/\s+/g, " ").trim();
  } catch {
    return raw.replace(/\s+/g, " ").trim();
  }
}

function documentContentToPlainText(doc) {
  const raw = doc.content || "";
  const type = doc.doc_type || "markdown";

  if (type === "slide" || type === "presentation") {
    return slideDeckToPlainText(raw);
  }

  if (type === "sheet") {
    try {
      const data = JSON.parse(raw);
      if (data.sheets && Array.isArray(data.sheets)) {
        return data.sheets
          .map((sh) => {
            const g = sh.grid;
            if (!g || !Array.isArray(g)) return "";
            return g
              .map((row) => (Array.isArray(row) ? row.join("\t") : ""))
              .join("\n");
          })
          .join("\n\n")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (Array.isArray(data)) {
        return data
          .map((row) => (Array.isArray(row) ? row.join("\t") : ""))
          .join("\n")
          .replace(/\s+/g, " ")
          .trim();
      }
    } catch {
      /* fall through */
    }
  }

  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

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

    const textContent = documentContentToPlainText(doc).slice(0, 12000);

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