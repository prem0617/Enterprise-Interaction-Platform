import SharedFile from "../../models/SharedFile.js";
import Employee from "../../models/Employee.js";
import { createBulkNotifications } from "../../utils/notificationHelper.js";
import User from "../../models/User.js";

export const uploadSharedFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { description, visibility, shared_with, shared_department, category } = req.body;

    const file = await SharedFile.create({
      uploaded_by: req.userId,
      file_name: req.file.originalname,
      file_url: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      cloudinary_public_id: req.file.filename,
      description: description || "",
      visibility: visibility || "everyone",
      shared_with: shared_with ? JSON.parse(shared_with) : [],
      shared_department: shared_department || null,
      category: category || "general",
    });

    const populated = await SharedFile.findById(file._id)
      .populate("uploaded_by", "first_name last_name email")
      .populate("shared_department", "name");

    // Notify recipients
    const uploader = await User.findById(req.userId).select("first_name last_name").lean();
    const uploaderName = `${uploader?.first_name || ""} ${uploader?.last_name || ""}`.trim();

    let recipientIds = [];
    if (visibility === "everyone") {
      const allUsers = await User.find({ status: "active", _id: { $ne: req.userId } }).select("_id").lean();
      recipientIds = allUsers.map((u) => u._id.toString());
    } else if (visibility === "specific" && shared_with) {
      recipientIds = JSON.parse(shared_with).filter((id) => id !== req.userId);
    } else if (visibility === "department" && shared_department) {
      const deptEmployees = await Employee.find({ department: shared_department, is_active: true }).select("user_id").lean();
      recipientIds = deptEmployees.map((e) => e.user_id.toString()).filter((id) => id !== req.userId);
    }

    if (recipientIds.length > 0) {
      createBulkNotifications(recipientIds.slice(0, 50), {
        type: "system",
        priority: "low",
        title: `${uploaderName} shared a file`,
        body: `"${req.file.originalname}" — ${description || "No description"}`,
        actorId: req.userId,
      }).catch(() => {});
    }

    res.status(201).json({ success: true, file: populated });
  } catch (error) {
    console.error("Upload shared file error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getSharedFiles = async (req, res) => {
  try {
    const userId = req.userId;
    const { category, search } = req.query;

    // Get user's department
    const emp = await Employee.findOne({ user_id: userId }).select("department").lean();
    const myDeptId = emp?.department?.toString();

    // Get user info to check if admin
    const user = await User.findById(userId).select("user_type").lean();
    const isAdmin = user?.user_type === "admin";

    let filter;
    if (isAdmin) {
      filter = {};
    } else {
      filter = {
        $or: [
          { visibility: "everyone" },
          { uploaded_by: userId },
          { shared_with: userId },
          ...(myDeptId ? [{ visibility: "department", shared_department: myDeptId }] : []),
        ],
      };
    }

    if (category && category !== "all") filter.category = category;

    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: [{ file_name: regex }, { description: regex }] });
    }

    const files = await SharedFile.find(filter)
      .populate("uploaded_by", "first_name last_name email profile_picture")
      .populate("shared_department", "name")
      .populate("shared_with", "first_name last_name email")
      .sort({ created_at: -1 })
      .limit(100);

    res.json({ files, total: files.length });
  } catch (error) {
    console.error("Get shared files error:", error);
    res.status(500).json({ error: "Failed to load files" });
  }
};

export const deleteSharedFile = async (req, res) => {
  try {
    const file = await SharedFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });

    const user = await User.findById(req.userId).select("user_type").lean();
    if (file.uploaded_by.toString() !== req.userId && user?.user_type !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await SharedFile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete" });
  }
};
