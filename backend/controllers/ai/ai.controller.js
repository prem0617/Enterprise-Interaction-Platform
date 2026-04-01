import OpenAI from "openai";
import { Message } from "../../models/Message.js";
import { ChannelMember } from "../../models/ChannelMember.js";
import { ChatChannel } from "../../models/ChatChannel.js";
import Document from "../../models/Document.js";
import Whiteboard from "../../models/Whiteboard.js";

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
    const { question, version_number } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const doc = await Document.findById(document_id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // If version_number is provided, answer using that version snapshot.
    let effectiveContent = doc.content || "";
    let effectiveTheme = doc.slide_theme || "light";
    const vNum = Number(version_number);
    if (Number.isFinite(vNum) && vNum >= 1 && Array.isArray(doc.versions) && doc.versions.length) {
      const v = doc.versions.find((x) => Number(x.version_number) === vNum);
      if (v) {
        effectiveContent = v.content_snapshot ?? effectiveContent;
        effectiveTheme = v.slide_theme_snapshot ?? effectiveTheme;
      }
    }

    // Strip HTML tags for cleaner context
    const textContent = (effectiveContent || "")
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
          content: `Document title: "${doc.title || "Untitled"}"\nVersion: v${Number.isFinite(vNum) && vNum >= 1 ? vNum : "latest"}\nSlide theme: ${effectiveTheme}\n\nDocument content:\n${textContent}\n\nQuestion: ${question.trim()}`,
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

export const documentEdit = async (req, res) => {
  try {
    const { document_id } = req.params;
    const { instruction, mode, selection_html, selection_text, full_html, version_number } = req.body || {};

    const userInstruction = String(instruction || "").trim();
    if (!userInstruction) {
      return res.status(400).json({ error: "instruction is required" });
    }

    const editMode = mode === "selection" || mode === "document" ? mode : null;
    if (!editMode) {
      return res.status(400).json({ error: "mode must be 'selection' or 'document'" });
    }

    const doc = await Document.findById(document_id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // If version_number is provided, use that snapshot as the base for full-document edits.
    let effectiveHtml = doc.content || "";
    const vNum = Number(version_number);
    if (Number.isFinite(vNum) && vNum >= 1 && Array.isArray(doc.versions) && doc.versions.length) {
      const v = doc.versions.find((x) => Number(x.version_number) === vNum);
      if (v?.content_snapshot !== undefined) effectiveHtml = v.content_snapshot ?? "";
    }

    if (editMode === "selection") {
      const selectedHtml = String(selection_html || "").trim();
      const selectedText = String(selection_text || "").trim();
      const selected = selectedHtml || selectedText;
      if (!selected) {
        return res.status(400).json({ error: "selection_html (or selection_text) is required for selection mode" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert editor working inside a rich-text HTML editor. Apply the user's instruction to ONLY the selected content. Output ONLY valid HTML for the replacement snippet (no markdown, no code fences, no explanations). Use semantic HTML: lists must be <ul>/<ol> with <li> items, headings <h1>-<h4>, paragraphs <p>. Keep formatting where possible unless instructed otherwise.",
          },
          {
            role: "user",
            content: `Instruction:\n${userInstruction}\n\nSelected content (HTML if available):\n${selected.slice(0, 8000)}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.2,
      });

      const edited_html = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.status(200).json({ edited_html });
    }

    // document mode
    const baseHtml = String(full_html ?? effectiveHtml ?? "");
    if (!baseHtml.trim()) {
      return res.status(400).json({ error: "full_html is required for document mode (or the document must not be empty)" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert document editor working inside a rich-text HTML editor. Apply the user's instruction to the entire document. Output ONLY valid HTML for the edited document body (no markdown, no code fences, no explanations). Use semantic HTML: lists must be <ul>/<ol> with <li> items, headings <h1>-<h4>, paragraphs <p>. Keep existing structure and formatting as much as possible unless the instruction requires changes.",
        },
        {
          role: "user",
          content: `Instruction:\n${userInstruction}\n\nHTML:\n${baseHtml.slice(0, 24000)}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const edited_html = completion.choices[0]?.message?.content?.trim() ?? "";
    return res.status(200).json({ edited_html });
  } catch (error) {
    console.error("Document edit error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const whiteboardDiagram = async (req, res) => {
  try {
    const { whiteboard_id } = req.params;
    const { instruction, elements, canvas_state } = req.body || {};

    const userInstruction = String(instruction || "").trim();
    if (!userInstruction) {
      return res.status(400).json({ error: "instruction is required" });
    }

    const wb = await Whiteboard.findById(whiteboard_id).lean();
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });

    const uid = String(req.user?.id || req.userId || "");
    const ownerId = String(wb.owner_id?._id ?? wb.owner_id ?? "");
    const collabs = Array.isArray(wb.collaborators) ? wb.collaborators.map((c) => String(c?._id ?? c)) : [];
    if (uid && uid !== ownerId && !collabs.includes(uid)) {
      return res.status(403).json({ error: "Not authorized to edit this whiteboard" });
    }

    const currentElements = Array.isArray(elements) ? elements : Array.isArray(wb.elements) ? wb.elements : [];
    const currentCanvasState = canvas_state && typeof canvas_state === "object" ? canvas_state : wb.canvas_state || {};

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            `You are a diagram generator for a custom HTML5 canvas whiteboard.\n\n` +
            `IMPORTANT OUTPUT RULES:\n` +
            `- Output ONLY strict JSON. No markdown, no prose, no code fences.\n` +
            `- The JSON MUST be an object with exactly: {"elements":[...],"canvas_state":{...}}.\n` +
            `- Use the SAME schema as the app uses. The frontend renders by iterating elements[] and drawing each element on a <canvas>.\n\n` +
            `SCHEMA (elements[]): each element is one of these tools:\n` +
            `- "pen": {id, tool:"pen", points:[[x,y],...], color, strokeWidth, opacity}\n` +
            `- "line": {id, tool:"line", x,y,w,h, color, strokeWidth, opacity}\n` +
            `- "arrow": {id, tool:"arrow", x,y,w,h, color, strokeWidth, opacity}\n` +
            `- "rect": {id, tool:"rect", x,y,w,h, color, strokeWidth, opacity, label?, fontSize?}\n` +
            `- "ellipse": {id, tool:"ellipse", x,y,w,h, color, strokeWidth, opacity, label?, fontSize?}\n` +
            `- "text": {id, tool:"text", x,y,w?,h?, text, color, fontSize, opacity}\n` +
            `- "connector": {id, tool:"connector", fromId, toId, color, strokeWidth, opacity}\n\n` +
            `NOTES:\n` +
            `- Coordinates are in "world" space numbers. The diagram will be displayed directly on an x/y coordinate plane, so you MUST imagine how it looks visually.\n` +
            `- Layout guidance: arrange left→right or top→bottom with consistent spacing; avoid overlaps; keep clear gaps between nodes and edges. Aim to fit within ~1200x700 world coords.\n` +
            `- Use unique string ids (keep existing ids if modifying; for new, make "el_ai_1", "el_ai_2", etc.).\n` +
            `\n` +
            `EDGE / CONNECTION RULES (CRITICAL):\n` +
            `- When connecting two shapes, you MUST use tool:"connector" with fromId/toId. Do NOT use plain "line"/"arrow" between shapes for relationships.\n` +
            `- This is required so that when a user moves shapes, the connection remains meaningfully attached (connectors anchor to element boundaries).\n` +
            `- Use "arrow" only for standalone arrows that are NOT meant to stay attached to shapes.\n` +
            `\n` +
            `COLOR RULES (CRITICAL):\n` +
            `- Follow the existing color format/palette used in the current board unless the user explicitly requests a different theme.\n` +
            `- For visibility, ALL connectors (and any arrows you output) MUST use a light, high-contrast color. Prefer "#93c5fd" or "#60a5fa".\n` +
            `- Node stroke colors can use the existing palette; keep text readable against the board background.\n` +
            `\n` +
            `canvas_state: may include { backgroundColor } (string hex like "#121218"). Preserve existing backgroundColor unless instructed.\n`,
        },
        {
          role: "user",
          content:
            `Instruction:\n${userInstruction}\n\n` +
            `Current canvas_state:\n${JSON.stringify(currentCanvasState).slice(0, 4000)}\n\n` +
            `Current elements JSON:\n${JSON.stringify(currentElements).slice(0, 18000)}`,
        },
      ],
      max_tokens: 1800,
      temperature: 0.25,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const tryParse = (s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    };

    let parsed = tryParse(raw);
    if (!parsed) {
      const m = raw.match(/\{[\s\S]*\}$/);
      if (m) parsed = tryParse(m[0]);
    }

    if (!parsed || typeof parsed !== "object") {
      return res.status(422).json({ error: "AI returned invalid JSON", raw });
    }

    const outElements = Array.isArray(parsed.elements) ? parsed.elements : null;
    const outCanvas = parsed.canvas_state && typeof parsed.canvas_state === "object" ? parsed.canvas_state : null;
    if (!outElements || !outCanvas) {
      return res.status(422).json({ error: "AI JSON must include elements and canvas_state", raw });
    }

    return res.status(200).json({ elements: outElements, canvas_state: outCanvas });
  } catch (error) {
    console.error("Whiteboard diagram error:", error);
    res.status(500).json({ error: error.message });
  }
};