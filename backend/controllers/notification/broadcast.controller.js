import User from "../../models/User.js";
import { createBulkNotifications } from "../../utils/notificationHelper.js";

export const sendBroadcast = async (req, res) => {
  try {
    const { title, body, priority, target } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    // Determine recipients
    let filter = { status: "active" };
    if (target === "employees") filter.user_type = "employee";
    else if (target === "admins") filter.user_type = "admin";
    else if (target === "customers") filter.user_type = "customer";
    // default: all active users

    const users = await User.find(filter).select("_id").lean();
    const recipientIds = users.map((u) => u._id.toString()).filter((id) => id !== req.userId);

    if (recipientIds.length === 0) return res.status(400).json({ error: "No recipients found" });

    const results = await createBulkNotifications(recipientIds, {
      type: "system",
      priority: priority || "high",
      title,
      body: body || "",
      actorId: req.userId,
    });

    res.json({ success: true, sent: results.length, total_recipients: recipientIds.length });
  } catch (error) {
    console.error("Broadcast error:", error);
    res.status(500).json({ error: "Failed to send broadcast" });
  }
};
