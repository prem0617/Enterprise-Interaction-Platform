import Notification from "../../models/Notification.js";

// Get notifications for the current user (paginated, newest first)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 30, before, unread_only } = req.query;

    const filter = { recipient_id: userId };
    if (before) filter.created_at = { $lt: new Date(before) };
    if (unread_only === "true") filter.is_read = false;

    const notifications = await Notification.find(filter)
      .populate("actor_id", "first_name last_name email profile_picture")
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      recipient_id: userId,
      is_read: false,
    });

    res.json({ notifications, unread_count: unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient_id: req.userId },
      { is_read: true, read_at: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient_id: req.userId, is_read: false },
      { is_read: true, read_at: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
};

// Get unread count only
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient_id: req.userId,
      is_read: false,
    });
    res.json({ unread_count: count });
  } catch (error) {
    res.status(500).json({ error: "Failed to get count" });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findOneAndDelete({ _id: id, recipient_id: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
};
