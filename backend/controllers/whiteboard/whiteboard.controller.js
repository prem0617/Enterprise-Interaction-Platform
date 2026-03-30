import crypto from "crypto";
import Whiteboard from "../../models/Whiteboard.js";

function generateSessionCode() {
  return "WB-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function canAccessWhiteboard(wb, userId) {
  const normalizeId = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (v._id) return String(v._id);
    if (v.id) return String(v.id);
    return String(v);
  };

  return (
    normalizeId(wb.owner_id) === String(userId) ||
    (wb.collaborators || []).map(normalizeId).includes(String(userId))
  );
}

async function ensureV1Exists(wb, userIdForCreatedBy) {
  if (!wb) return wb;
  if (Array.isArray(wb.versions) && wb.versions.length > 0) return wb;

  const createdBy =
    userIdForCreatedBy || (wb.owner_id?._id ? wb.owner_id._id : wb.owner_id);
  wb.version_counter = Math.max(1, Number(wb.version_counter || 0));
  if (wb.version_counter === 0) wb.version_counter = 1;
  wb.versions = [
    {
      version_number: 1,
      version_label: "Initial (v1)",
      created_by: createdBy,
      elements_snapshot: wb.elements ?? [],
      canvas_state_snapshot: wb.canvas_state ?? {},
      createdAt: new Date(),
    },
  ];
  await wb.save();
  return wb;
}

// ─── Create ──────────────────────────────────────────────────
export const createWhiteboard = async (req, res) => {
  try {
    const { title, is_public } = req.body;
    const wb = await Whiteboard.create({
      title: title || "Untitled Whiteboard",
      session_code: generateSessionCode(),
      owner_id: req.user.id,
      collaborators: [req.user.id],
      is_public: is_public !== undefined ? is_public : true,
    });
    // Create default v1 (manual versioning baseline)
    wb.version_counter = 1;
    wb.versions = [
      {
        version_number: 1,
        version_label: "Initial (v1)",
        created_by: req.user.id,
        elements_snapshot: wb.elements ?? [],
        canvas_state_snapshot: wb.canvas_state ?? {},
      },
    ];
    await wb.save();
    const populated = await Whiteboard.findById(wb._id)
      .populate("owner_id", "name email profile_picture")
      .populate("collaborators", "name email profile_picture");
    res.status(201).json(populated);
  } catch (error) {
    console.error("Create whiteboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── List ────────────────────────────────────────────────────
export const getMyWhiteboards = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = "active" } = req.query;
    const whiteboards = await Whiteboard.find({
      status,
      $or: [{ owner_id: userId }, { collaborators: userId }],
    })
      .populate("owner_id", "name email profile_picture")
      .populate("last_edited_by", "name email profile_picture")
      .sort({ updatedAt: -1 })
      .select("-elements -canvas_state");
    res.json(whiteboards);
  } catch (error) {
    console.error("Get whiteboards error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Get by ID ───────────────────────────────────────────────
export const getWhiteboardById = async (req, res) => {
  try {
    let wb = await Whiteboard.findById(req.params.id)
      .populate("owner_id", "name email profile_picture")
      .populate("collaborators", "name email profile_picture");
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to view whiteboard" });
    }

    // Backward compatibility: if board existed before versions, create v1.
    wb = await ensureV1Exists(wb, req.user.id);
    res.json(wb);
  } catch (error) {
    console.error("Get whiteboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Versions list (paginated) ────────────────────────────────
export const getWhiteboardVersions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    let wb = await Whiteboard.findById(req.params.id).populate(
      "versions.created_by",
      "name email"
    );
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to view versions" });
    }
    wb = await ensureV1Exists(wb, req.user.id);

    const sortedVersions = [...(wb.versions || [])].sort(
      (a, b) => b.version_number - a.version_number
    );
    const total = sortedVersions.length;
    const versions = sortedVersions.slice(skip, skip + limit).map((v) => ({
      _id: v._id,
      version_number: v.version_number,
      version_label: v.version_label,
      createdAt: v.createdAt,
      created_by: v.created_by
        ? {
            _id: v.created_by._id,
            name: v.created_by.name || v.created_by.email || "Unknown",
            email: v.created_by.email,
          }
        : null,
    }));

    res.json({
      versions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Get whiteboard versions error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Single version snapshot ──────────────────────────────────
export const getWhiteboardVersionSnapshot = async (req, res) => {
  try {
    const versionNumber = Number(req.params.versionNumber);
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ error: "Invalid version number" });
    }
    let wb = await Whiteboard.findById(req.params.id).populate(
      "versions.created_by",
      "name email"
    );
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to view versions" });
    }
    wb = await ensureV1Exists(wb, req.user.id);

    const version = (wb.versions || []).find(
      (v) => Number(v.version_number) === versionNumber
    );
    if (!version) return res.status(404).json({ error: "Version not found" });

    res.json({
      version_number: version.version_number,
      version_label: version.version_label,
      createdAt: version.createdAt,
      created_by: version.created_by
        ? {
            _id: version.created_by._id,
            name: version.created_by.name || version.created_by.email || "Unknown",
            email: version.created_by.email,
          }
        : null,
      elements: version.elements_snapshot || [],
      canvas_state: version.canvas_state_snapshot || {},
    });
  } catch (error) {
    console.error("Get version snapshot error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Create version snapshot ──────────────────────────────────
export const createWhiteboardVersionSnapshot = async (req, res) => {
  try {
    const { elements, canvas_state } = req.body;
    const wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to create versions" });
    }

    // NOTE: kept for backward compatibility, but prefer POST /:id/versions for manual versioning.
    const nextVersion = Math.max(1, Number(wb.version_counter || 0)) + 1;
    const versionLabel = `Snapshot v${nextVersion}`;
    wb.version_counter = nextVersion;
    wb.versions.push({
      version_number: nextVersion,
      version_label: versionLabel,
      created_by: req.user.id,
      elements_snapshot: elements !== undefined ? elements : wb.elements,
      canvas_state_snapshot:
        canvas_state !== undefined ? canvas_state : wb.canvas_state,
    });
    if (wb.versions.length > 1000) wb.versions = wb.versions.slice(-1000);
    wb.last_edited_by = req.user.id;
    await wb.save();

    res.status(201).json({
      success: true,
      version_number: nextVersion,
      version_label: versionLabel,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Create version snapshot error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Rename version label ─────────────────────────────────────
export const renameWhiteboardVersion = async (req, res) => {
  try {
    const versionNumber = Number(req.params.versionNumber);
    const nextLabel = String(req.body?.version_label || "").trim();
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ error: "Invalid version number" });
    }
    if (!nextLabel) {
      return res.status(400).json({ error: "Version label is required" });
    }
    const wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to edit versions" });
    }
    const version = (wb.versions || []).find(
      (v) => Number(v.version_number) === versionNumber
    );
    if (!version) return res.status(404).json({ error: "Version not found" });

    const isOwner = String(wb.owner_id) === String(req.user.id);
    const isCreator = String(version.created_by) === String(req.user.id);
    if (!isOwner && !isCreator) {
      return res.status(403).json({ error: "Only creator/owner can rename version" });
    }

    version.version_label = nextLabel;
    wb.last_edited_by = req.user.id;
    await wb.save();
    return res.json({
      success: true,
      version_number: version.version_number,
      version_label: version.version_label,
    });
  } catch (error) {
    console.error("Rename version error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Create manual version (copy-from-base) ───────────────────
export const createWhiteboardVersion = async (req, res) => {
  try {
    const baseVersionNumber = Number(req.body?.base_version_number || 1);
    const commitMessage = String(req.body?.commit_message || "").trim();
    if (!commitMessage) {
      return res.status(400).json({ error: "Commit message is required" });
    }

    let wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to create versions" });
    }
    wb = await ensureV1Exists(wb, req.user.id);

    const base = (wb.versions || []).find(
      (v) => Number(v.version_number) === baseVersionNumber
    );
    if (!base) return res.status(404).json({ error: "Base version not found" });

    const nextVersion = Math.max(1, Number(wb.version_counter || 1)) + 1;
    wb.version_counter = nextVersion;
    wb.versions.push({
      version_number: nextVersion,
      version_label: commitMessage,
      created_by: req.user.id,
      elements_snapshot: base.elements_snapshot ?? [],
      canvas_state_snapshot: base.canvas_state_snapshot ?? {},
    });
    if (wb.versions.length > 1000) wb.versions = wb.versions.slice(-1000);
    wb.last_edited_by = req.user.id;
    await wb.save();

    return res.status(201).json({
      success: true,
      version_number: nextVersion,
      version_label: commitMessage,
      base_version_number: baseVersionNumber,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Create whiteboard version error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Save content into a specific version (overwrite) ─────────
export const saveVersionContent = async (req, res) => {
  try {
    const versionNumber = Number(req.params.versionNumber);
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ error: "Invalid version number" });
    }
    const { elements, canvas_state } = req.body || {};

    let wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (!canAccessWhiteboard(wb, req.user.id)) {
      return res.status(403).json({ error: "Not authorized to edit whiteboard" });
    }
    wb = await ensureV1Exists(wb, req.user.id);

    const version = (wb.versions || []).find(
      (v) => Number(v.version_number) === versionNumber
    );
    if (!version) return res.status(404).json({ error: "Version not found" });

    if (elements !== undefined) version.elements_snapshot = elements;
    if (canvas_state !== undefined) version.canvas_state_snapshot = canvas_state;

    // Keep top-level content in sync with last edited version for preview/compat.
    if (elements !== undefined) wb.elements = elements;
    if (canvas_state !== undefined) wb.canvas_state = canvas_state;

    wb.last_edited_by = req.user.id;
    await wb.save();
    return res.json({ success: true, updatedAt: wb.updatedAt, version_number: versionNumber });
  } catch (error) {
    console.error("Save version content error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Join by code ────────────────────────────────────────────
export const joinByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;
    const wb = await Whiteboard.findOne({ session_code: code.toUpperCase() });
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (wb.status === "archived") return res.status(410).json({ error: "Whiteboard is archived" });
    if (!wb.collaborators.map(String).includes(String(userId))) {
      wb.collaborators.push(userId);
      await wb.save();
    }
    const populated = await Whiteboard.findById(wb._id)
      .populate("owner_id", "name email profile_picture")
      .populate("collaborators", "name email profile_picture");
    res.json(populated);
  } catch (error) {
    console.error("Join whiteboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Update metadata ────────────────────────────────────────
export const updateWhiteboard = async (req, res) => {
  try {
    const { title, is_public } = req.body;
    const wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (title !== undefined) wb.title = title;
    if (is_public !== undefined) wb.is_public = is_public;
    wb.last_edited_by = req.user.id;
    await wb.save();
    res.json(wb);
  } catch (error) {
    console.error("Update whiteboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Save content ───────────────────────────────────────────
export const saveContent = async (req, res) => {
  try {
    const { elements, canvas_state } = req.body;
    const wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (elements !== undefined) wb.elements = elements;
    if (canvas_state !== undefined) wb.canvas_state = canvas_state;
    wb.last_edited_by = req.user.id;
    await wb.save();
    res.json({ success: true, updatedAt: wb.updatedAt });
  } catch (error) {
    console.error("Save content error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Archive ────────────────────────────────────────────────
export const archiveWhiteboard = async (req, res) => {
  try {
    const wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (String(wb.owner_id) !== String(req.user.id))
      return res.status(403).json({ error: "Only the owner can archive" });
    wb.status = "archived";
    await wb.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Archive whiteboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Delete ─────────────────────────────────────────────────
export const deleteWhiteboard = async (req, res) => {
  try {
    const wb = await Whiteboard.findById(req.params.id);
    if (!wb) return res.status(404).json({ error: "Whiteboard not found" });
    if (String(wb.owner_id) !== String(req.user.id))
      return res.status(403).json({ error: "Only the owner can delete" });
    await Whiteboard.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete whiteboard error:", error);
    res.status(500).json({ error: error.message });
  }
};
