import { ChatChannel } from "../../models/ChatChannel.js";
import { ChannelMember } from "../../models/ChannelMember.js";
import { Message } from "../../models/Message.js";

import { cloudinary } from "../../config/cloudinary.js";
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import fetch from "node-fetch"; // or use axios — already imported in your project
import User from "../../models/User.js";

// ─────────────────────────────────────────────
// Helper: extract text content from a file
// Supports: PDF, DOCX, TXT, plain-text types
// For images: returns a placeholder (no OCR dependency needed)
// ─────────────────────────────────────────────
const extractTextContent = async (fileUrl, mimeType, originalName) => {
  try {
    // Fetch the raw file buffer from Cloudinary URL
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    // PDF
    if (mimeType === "application/pdf") {
      const data = await pdfParse(buffer);
      return data.text?.trim() || "";
    }

    // DOCX
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      originalName?.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || "";
    }

    // Plain text / CSV / JSON / XML / Markdown
    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      originalName?.match(/\.(txt|csv|json|xml|md|log)$/i)
    ) {
      return buffer.toString("utf-8").trim();
    }

    // Images — return a note; swap in tesseract.js if you want OCR
    if (mimeType.startsWith("image/")) {
      return `[Image file: ${originalName}. OCR not enabled.]`;
    }

    // Unsupported type
    return `[Content extraction not supported for type: ${mimeType}]`;
  } catch (err) {
    console.error("Content extraction error:", err.message);
    return `[Extraction failed: ${err.message}]`;
  }
};

// ─────────────────────────────────────────────
// Controller 1: Upload file message
// POST /direct_chat/channels/:channelId/files
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// Controller 2: Extract / view file content
// GET /direct_chat/files/:fileId/content
//
// Returns the stored extracted text so the
// frontend can render it inline — no redirect,
// no download, just the content as JSON.
// ─────────────────────────────────────────────
export const extractFileContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    const fileRecord = await File.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ error: "File record not found" });
    }

    // ── Access check ──────────────────────────────────────────────────
    const uploader = await User.findById(userId).select("department");
    const userDepartment = uploader?.department || null;

    if (!fileRecord.hasAccess(userId, userDepartment)) {
      return res.status(403).json({ error: "You do not have access to this file" });
    }

    // ── Log the view activity ─────────────────────────────────────────
    fileRecord.logActivity(userId, "view", req.ip || null);
    await fileRecord.save();

    // ── Return content ────────────────────────────────────────────────
    const content = fileRecord.metadata?.description || "";
    const hasContent =
      content.length > 0 &&
      !content.startsWith("[Content extraction not supported") &&
      !content.startsWith("[Image file:") &&
      !content.startsWith("[Extraction failed:");

    return res.status(200).json({
      file_id: fileRecord._id,
      file_name: fileRecord.file_name,
      file_type: fileRecord.file_type,
      file_size: fileRecord.file_size,
      storage_url: fileRecord.storage_url,
      uploaded_by: fileRecord.uploader_info,
      created_at: fileRecord.created_at,
      has_extracted_content: hasContent,
      content: content,                          // ← the extracted text
      metadata: {
        tags: fileRecord.metadata?.tags || [],
        category: fileRecord.metadata?.category || null,
      },
      permissions: {
        is_public: fileRecord.permissions?.is_public,
        department: fileRecord.permissions?.department,
      },
    });
  } catch (error) {
    console.error("Error fetching file content:", error);
    return res.status(500).json({ error: "Failed to fetch file content", message: error.message });
  }
};