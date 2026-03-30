import { verifyChatReplyPushToken } from "../../utils/pushActionToken.js";
import { sendMessage as sendGroupMessage } from "../chat/message.controller.js";
import { sendMessage as sendDirectMessage } from "../chat/direct_message.controller.js";

export const quickReplyChat = async (req, res) => {
  try {
    const { token, reply } = req.body || {};
    const payload = verifyChatReplyPushToken(token);
    if (!payload) return res.status(400).json({ error: "Invalid or expired reply token" });

    const content = typeof reply === "string" ? reply.trim() : "";
    if (!content) return res.status(400).json({ error: "Reply text is required" });

    if (payload.kind === "direct") {
      // direct_message controller expects channelId in params + content in body.
      req.userId = payload.userId;
      req.params = { ...(req.params || {}), channelId: payload.channelId };
      req.body = {
        ...(req.body || {}),
        content,
        parent_message_id: payload.parentMessageId,
      };
      return sendDirectMessage(req, res);
    }

    // group messages controller expects channel_id in body.
    req.userId = payload.userId;
    req.params = { ...(req.params || {}) };
    req.body = {
      ...(req.body || {}),
      channel_id: payload.channelId,
      content,
      parent_message_id: payload.parentMessageId,
      message_type: "text",
    };
    return sendGroupMessage(req, res);
  } catch (err) {
    console.error("[PUSH] quickReplyChat error:", err?.message || err);
    return res.status(500).json({ error: "Failed to send quick reply" });
  }
};

