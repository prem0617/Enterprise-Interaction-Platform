import Document from "../../models/Document.js";
import User from "../../models/User.js";
import multer from "multer";
import { cloudinary } from "../../config/cloudinary.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUid = (req) => req.userId || req.user?._id;

// Handle both populated (object with _id) and raw ObjectId values
const idStr = (val) => String(val?._id ?? val);

function findCollabEntry(doc, userId) {
  return doc.collaborators.find((c) => idStr(c.user) === String(userId)) ?? null;
}

function canRead(doc, userId) {
  if (doc.is_public) return true;
  if (idStr(doc.owner) === String(userId)) return true;
  return !!findCollabEntry(doc, userId);
}

function canWrite(doc, userId) {
  if (idStr(doc.owner) === String(userId)) return true;
  const entry = findCollabEntry(doc, userId);
  return entry?.access === "write";
}

function isOwnerOrAdmin(doc, userId, req) {
  return idStr(doc.owner) === String(userId) || req.user?.user_type === "admin";
}

async function ensureDocV1Exists(doc, userIdForCreatedBy) {
  if (!doc) return doc;
  if (Array.isArray(doc.versions) && doc.versions.length > 0) return doc;

  const createdBy = userIdForCreatedBy || doc.owner;
  doc.version_counter = Math.max(1, Number(doc.version_counter || 0));
  if (doc.version_counter === 0) doc.version_counter = 1;
  doc.versions = [
    {
      version_number: 1,
      version_label: "Initial (v1)",
      created_by: createdBy,
      content_snapshot: doc.content || "",
      slide_theme_snapshot: doc.slide_theme || "light",
      createdAt: new Date(),
    },
  ];
  await doc.save();
  return doc;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createDocument = async (req, res) => {
  try {
    const { title, content, is_public, doc_type } = req.body;
    const owner = getUid(req);

    const doc = new Document({
      title: title || "Untitled document",
      content: content || "",
      doc_type: ["doc", "sheet", "slide"].includes(doc_type) ? doc_type : "doc",
      slide_theme: "light",
      owner,
      is_public: !!is_public,
      collaborators: [],
    });

    await doc.save();
    // Default v1 (manual versioning baseline)
    doc.version_counter = 1;
    doc.versions = [
      {
        version_number: 1,
        version_label: "Initial (v1)",
        created_by: owner,
        content_snapshot: doc.content || "",
        slide_theme_snapshot: doc.slide_theme || "light",
      },
    ];
    await doc.save();
    await doc.populate("owner", "first_name last_name email profile_picture");
    res.status(201).json(doc);
  } catch (err) {
    console.error("createDocument:", err);
    res.status(500).json({ error: err.message });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const userId = getUid(req);

    const docs = await Document.find({
      $or: [
        { owner: userId },
        { "collaborators.user": userId },
      ],
    })
      .sort({ updated_at: -1 })
      .limit(200)
      .populate("owner", "first_name last_name email profile_picture")
      .populate("collaborators.user", "first_name last_name email profile_picture")
      .populate("last_edited_by", "first_name last_name email profile_picture")
      .lean();

    const enriched = docs.map((doc) => {
      const ownerIdStr = String(doc.owner?._id ?? doc.owner);
      const isOwnerFlag = ownerIdStr === String(userId);
      const collab = (doc.collaborators || []).find(
        (c) => String(c.user?._id ?? c.user) === String(userId)
      );
      return {
        ...doc,
        my_access: isOwnerFlag ? "owner" : collab?.access ?? (doc.is_public ? "read" : null),
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("listDocuments:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUid(req);

    let doc = await Document.findById(id)
      .populate("owner", "first_name last_name email profile_picture")
      .populate("collaborators.user", "first_name last_name email profile_picture")
      .populate("last_edited_by", "first_name last_name email profile_picture")
      .lean();

    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canRead(doc, userId)) return res.status(403).json({ error: "Access denied" });

    // Backward compatibility: ensure v1 exists for legacy docs
    if (!Array.isArray(doc.versions) || doc.versions.length === 0) {
      const mutable = await Document.findById(id);
      await ensureDocV1Exists(mutable, userId);
      doc = await Document.findById(id)
        .populate("owner", "first_name last_name email profile_picture")
        .populate("collaborators.user", "first_name last_name email profile_picture")
        .populate("last_edited_by", "first_name last_name email profile_picture")
        .lean();
    }

    const isOwnerFlag = String(doc.owner?._id ?? doc.owner) === String(userId);
    const collab = (doc.collaborators || []).find(
      (c) => String(c.user?._id ?? c.user) === String(userId)
    );

    res.json({
      ...doc,
      my_access: isOwnerFlag ? "owner" : collab?.access ?? (doc.is_public ? "read" : null),
    });
  } catch (err) {
    console.error("getDocumentById:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, is_public, slide_theme } = req.body;
    const userId = getUid(req);

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!canWrite(doc, userId)) {
      return res.status(403).json({ error: "You have read-only access to this document" });
    }

    if (title   !== undefined) doc.title   = title;
    if (content !== undefined) {
      doc.content = content;
      doc.last_edited_by = userId;
    }

    // Only owner/admin can toggle public visibility
    if (is_public !== undefined && isOwnerOrAdmin(doc, userId, req)) {
      doc.is_public = !!is_public;
    }

    if (slide_theme !== undefined) doc.slide_theme = slide_theme;

    await doc.save();
    await doc.populate("owner", "first_name last_name email profile_picture");
    await doc.populate("collaborators.user", "first_name last_name email profile_picture");
    await doc.populate("last_edited_by", "first_name last_name email profile_picture");
    res.json(doc);
  } catch (err) {
    console.error("updateDocument:", err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUid(req);

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!isOwnerOrAdmin(doc, userId, req)) {
      return res.status(403).json({ error: "Only the owner can delete this document" });
    }

    await doc.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("deleteDocument:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Collaborator management ──────────────────────────────────────────────────

/**
 * GET /documents/:id/collaborators
 * Returns the full collaborator list with populated user details.
 * Requires at least read access.
 */
export const getCollaborators = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUid(req);

    const doc = await Document.findById(id)
      .populate("collaborators.user", "first_name last_name email profile_picture")
      .lean();

    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canRead(doc, userId)) return res.status(403).json({ error: "Access denied" });

    res.json(doc.collaborators || []);
  } catch (err) {
    console.error("getCollaborators:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /documents/:id/collaborators
 * Body: { userId, access: "read" | "write" }
 * Only owner/admin can add collaborators.
 * If the user is already a collaborator their access is updated (upsert).
 */
export const addCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: targetId, access = "read" } = req.body;
    const requesterId = getUid(req);

    if (!targetId) return res.status(400).json({ error: "userId is required" });
    if (!["read", "write"].includes(access)) {
      return res.status(400).json({ error: "access must be 'read' or 'write'" });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!isOwnerOrAdmin(doc, requesterId, req)) {
      return res.status(403).json({ error: "Only the owner can add collaborators" });
    }
    if (String(doc.owner) === String(targetId)) {
      return res.status(400).json({ error: "Cannot add the owner as a collaborator" });
    }

    const targetUser = await User.findById(targetId).lean();
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const existing = findCollabEntry(doc, targetId);
    if (existing) {
      existing.access = access; // update access in place
    } else {
      doc.collaborators.push({ user: targetId, access });
    }

    await doc.save();
    await doc.populate("collaborators.user", "first_name last_name email profile_picture");

    res.json(doc.collaborators);
  } catch (err) {
    console.error("addCollaborator:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /documents/:id/collaborators/:userId
 * Body: { access: "read" | "write" }
 * Only owner/admin can change access levels.
 */
export const updateCollaboratorAccess = async (req, res) => {
  try {
    const { id, userId: targetId } = req.params;
    const { access } = req.body;
    const requesterId = getUid(req);

    if (!["read", "write"].includes(access)) {
      return res.status(400).json({ error: "access must be 'read' or 'write'" });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!isOwnerOrAdmin(doc, requesterId, req)) {
      return res.status(403).json({ error: "Only the owner can change access levels" });
    }

    const entry = findCollabEntry(doc, targetId);
    if (!entry) return res.status(404).json({ error: "Collaborator not found" });

    entry.access = access;
    await doc.save();
    await doc.populate("collaborators.user", "first_name last_name email profile_picture");

    res.json(doc.collaborators);
  } catch (err) {
    console.error("updateCollaboratorAccess:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /documents/:id/collaborators/:userId
 * Owner/admin can remove anyone. A collaborator can remove themselves (leave).
 */
export const removeCollaborator = async (req, res) => {
  try {
    const { id, userId: targetId } = req.params;
    const requesterId = getUid(req);

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const isSelf = String(requesterId) === String(targetId);
    if (!isOwnerOrAdmin(doc, requesterId, req) && !isSelf) {
      return res.status(403).json({ error: "Not allowed" });
    }

    doc.collaborators = doc.collaborators.filter(
      (c) => String(c.user) !== String(targetId)
    );

    await doc.save();
    await doc.populate("collaborators.user", "first_name last_name email profile_picture");

    res.json(doc.collaborators);
  } catch (err) {
    console.error("removeCollaborator:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── User search ──────────────────────────────────────────────────────────────

/**
 * GET /documents/search-users?q=john&docId=xxx
 *
 * Searches active users by name or email.
 * Excludes: the requester, the document owner, and existing collaborators.
 * `docId` is optional — if omitted only the requester is excluded.
 */
export const searchUsers = async (req, res) => {
  try {
    const { q = "", docId } = req.query;
    const requesterId = getUid(req);

    if (q.trim().length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    // Build exclusion list
    const exclude = new Set([String(requesterId)]);
    if (docId) {
      const doc = await Document.findById(docId).lean();
      if (doc) {
        exclude.add(String(doc.owner));
        (doc.collaborators || []).forEach((c) => exclude.add(String(c.user)));
      }
    }

    const regex = new RegExp(q.trim(), "i");

    const users = await User.find({
      _id:    { $nin: Array.from(exclude) },
      status: "active",
      $or: [
        { first_name: regex },
        { last_name:  regex },
        { email:      regex },
        {
          $expr: {
            $regexMatch: {
              input:   { $concat: ["$first_name", " ", "$last_name"] },
              regex:   q.trim(),
              options: "i",
            },
          },
        },
      ],
    })
      .select("first_name last_name email profile_picture")
      .limit(10)
      .lean();

    res.json(users);
  } catch (err) {
    console.error("searchUsers:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Share-link access (no auth required) ─────────────────────────────────────

/**
 * GET /documents/share/:token
 * Returns the document if the share_token is valid and the doc is public.
 * No authentication required — anyone with the link can view.
 */
export const getDocumentByShareToken = async (req, res) => {
  try {
    const { token } = req.params;

    const doc = await Document.findOne({ share_token: token })
      .populate("owner", "first_name last_name email profile_picture")
      .populate("collaborators.user", "first_name last_name email profile_picture")
      .populate("last_edited_by", "first_name last_name email profile_picture")
      .lean();

    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!doc.is_public) return res.status(403).json({ error: "This document is not publicly shared" });

    res.json({ ...doc, my_access: "read" });
  } catch (err) {
    console.error("getDocumentByShareToken:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Auto-save (PATCH — partial update) ───────────────────────────────────────

/**
 * PATCH /documents/:id
 * Lightweight save — only updates content and updated_at.
 */
export const autoSaveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, title } = req.body;
    const userId = getUid(req);

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canWrite(doc, userId)) {
      return res.status(403).json({ error: "Read-only access" });
    }

    if (content !== undefined) {
      doc.content = content;
      doc.last_edited_by = userId;
    }
    if (title !== undefined) doc.title = title;

    await doc.save();
    res.json({ success: true, updated_at: doc.updated_at });
  } catch (err) {
    console.error("autoSaveDocument:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Manual versions (list / load / create / save) ───────────────────────────

export const getDocumentVersions = async (req, res) => {
  try {
    const userId = getUid(req);
    const doc = await Document.findById(req.params.id).populate(
      "versions.created_by",
      "first_name last_name email"
    );
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canRead(doc, userId)) return res.status(403).json({ error: "Access denied" });
    await ensureDocV1Exists(doc, userId);

    const versions = [...(doc.versions || [])]
      .sort((a, b) => b.version_number - a.version_number)
      .map((v) => ({
        _id: v._id,
        version_number: v.version_number,
        version_label: v.version_label,
        createdAt: v.createdAt,
        created_by: v.created_by
          ? {
              _id: v.created_by._id,
              name:
                `${v.created_by.first_name || ""} ${v.created_by.last_name || ""}`.trim() ||
                v.created_by.email ||
                "Unknown",
              email: v.created_by.email,
            }
          : null,
      }));

    res.json({ versions });
  } catch (err) {
    console.error("getDocumentVersions:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getDocumentVersionSnapshot = async (req, res) => {
  try {
    const userId = getUid(req);
    const versionNumber = Number(req.params.versionNumber);
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ error: "Invalid version number" });
    }

    const doc = await Document.findById(req.params.id).populate(
      "versions.created_by",
      "first_name last_name email"
    );
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canRead(doc, userId)) return res.status(403).json({ error: "Access denied" });
    await ensureDocV1Exists(doc, userId);

    const v = (doc.versions || []).find((x) => Number(x.version_number) === versionNumber);
    if (!v) return res.status(404).json({ error: "Version not found" });

    res.json({
      version_number: v.version_number,
      version_label: v.version_label,
      createdAt: v.createdAt,
      content: v.content_snapshot ?? "",
      slide_theme: v.slide_theme_snapshot ?? doc.slide_theme ?? "light",
    });
  } catch (err) {
    console.error("getDocumentVersionSnapshot:", err);
    res.status(500).json({ error: err.message });
  }
};

export const createDocumentVersion = async (req, res) => {
  try {
    const userId = getUid(req);
    const baseVersionNumber = Number(req.body?.base_version_number || 1);
    const commitMessage = String(req.body?.commit_message || "").trim();
    if (!commitMessage) return res.status(400).json({ error: "Commit message is required" });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canWrite(doc, userId)) {
      return res.status(403).json({ error: "You have read-only access to this document" });
    }
    await ensureDocV1Exists(doc, userId);

    const base = (doc.versions || []).find((v) => Number(v.version_number) === baseVersionNumber);
    if (!base) return res.status(404).json({ error: "Base version not found" });

    const nextVersion = Math.max(1, Number(doc.version_counter || 1)) + 1;
    doc.version_counter = nextVersion;
    doc.versions.push({
      version_number: nextVersion,
      version_label: commitMessage,
      created_by: userId,
      content_snapshot: base.content_snapshot ?? "",
      slide_theme_snapshot: base.slide_theme_snapshot ?? doc.slide_theme ?? "light",
    });
    doc.last_edited_by = userId;
    await doc.save();

    res.status(201).json({
      success: true,
      version_number: nextVersion,
      version_label: commitMessage,
      base_version_number: baseVersionNumber,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("createDocumentVersion:", err);
    res.status(500).json({ error: err.message });
  }
};

export const saveDocumentVersionContent = async (req, res) => {
  try {
    const userId = getUid(req);
    const versionNumber = Number(req.params.versionNumber);
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ error: "Invalid version number" });
    }
    const { content, slide_theme } = req.body || {};

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canWrite(doc, userId)) {
      return res.status(403).json({ error: "You have read-only access to this document" });
    }
    await ensureDocV1Exists(doc, userId);

    const v = (doc.versions || []).find((x) => Number(x.version_number) === versionNumber);
    if (!v) return res.status(404).json({ error: "Version not found" });

    if (content !== undefined) {
      v.content_snapshot = content;
      doc.content = content; // keep top-level in sync
      doc.last_edited_by = userId;
    }
    if (slide_theme !== undefined) {
      v.slide_theme_snapshot = slide_theme;
      doc.slide_theme = slide_theme; // keep top-level in sync
    }

    await doc.save();
    res.json({ success: true, updated_at: doc.updated_at, version_number: versionNumber });
  } catch (err) {
    console.error("saveDocumentVersionContent:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Document image upload (Cloudinary) ───────────────────────────────────────
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

export const uploadDocumentImageMiddleware = imageUpload.single("file");

export const uploadDocumentImage = async (req, res) => {
  try {
    const userId = getUid(req);
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!canWrite(doc, userId)) {
      return res.status(403).json({ error: "You have read-only access to this document" });
    }
    if (!req.file?.buffer) return res.status(400).json({ error: "No file uploaded" });

    const b64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: `documents/${doc._id}/images`,
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    return res.status(201).json({
      success: true,
      url: uploadRes.secure_url,
      public_id: uploadRes.public_id,
      width: uploadRes.width,
      height: uploadRes.height,
    });
  } catch (err) {
    console.error("uploadDocumentImage:", err);
    return res.status(500).json({ error: err.message });
  }
};