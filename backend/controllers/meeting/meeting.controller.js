import Meeting from "../../models/Meeting.js";
import User from "../../models/User.js";
import { v4 as uuidv4 } from "uuid";

// Generate a unique meeting code
const generateMeetingCode = () => {
  return `MTG-${uuidv4().substring(0, 8).toUpperCase()}`;
};

// Create a new meeting
export const createMeeting = async (req, res) => {
  try {
    const { title, meeting_type, scheduled_at, participants, recording_enabled, description } = req.body;

    if (!title || !meeting_type || !scheduled_at) {
      return res.status(400).json({ error: "Title, meeting type, and scheduled date are required" });
    }

    const meeting = await Meeting.create({
      meeting_code: generateMeetingCode(),
      title,
      host_id: req.user._id,
      meeting_type,
      scheduled_at: new Date(scheduled_at),
      recording_enabled: recording_enabled || false,
      participants: participants || [],
      description: description || "",
      status: "scheduled"
    });

    // Populate host info
    await meeting.populate("host_id", "first_name last_name email");

    res.status(201).json({
      message: "Meeting created successfully",
      meeting
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

// Get all meetings for the current user (as host or participant)
export const getMyMeetings = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    
    let query = {
      $or: [
        { host_id: req.user._id },
        { participants: req.user._id }
      ]
    };

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query.scheduled_at = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate("host_id", "first_name last_name email")
      .populate("participants", "first_name last_name email")
      .sort({ scheduled_at: 1 });

    res.json({ meetings });
  } catch (error) {
    console.error("Get meetings error:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

// Get upcoming meetings
export const getUpcomingMeetings = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const meetings = await Meeting.find({
      $or: [
        { host_id: req.user._id },
        { participants: req.user._id }
      ],
      scheduled_at: { $gte: new Date() },
      status: { $in: ["scheduled", "active"] }
    })
      .populate("host_id", "first_name last_name email")
      .sort({ scheduled_at: 1 })
      .limit(parseInt(limit));

    res.json({ meetings });
  } catch (error) {
    console.error("Get upcoming meetings error:", error);
    res.status(500).json({ error: "Failed to fetch upcoming meetings" });
  }
};

// Get a single meeting by ID
export const getMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findById(id)
      .populate("host_id", "first_name last_name email")
      .populate("participants", "first_name last_name email");

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({ meeting });
  } catch (error) {
    console.error("Get meeting error:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

// Update a meeting (host only)
export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, meeting_type, scheduled_at, participants, recording_enabled, status, description } = req.body;

    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Check if user is the host
    if (meeting.host_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the host can update this meeting" });
    }

    // Update fields
    if (title) meeting.title = title;
    if (meeting_type) meeting.meeting_type = meeting_type;
    if (scheduled_at) meeting.scheduled_at = new Date(scheduled_at);
    if (participants) meeting.participants = participants;
    if (typeof recording_enabled === "boolean") meeting.recording_enabled = recording_enabled;
    if (status) meeting.status = status;
    if (description !== undefined) meeting.description = description;

    await meeting.save();
    await meeting.populate("host_id", "first_name last_name email");
    await meeting.populate("participants", "first_name last_name email");

    res.json({
      message: "Meeting updated successfully",
      meeting
    });
  } catch (error) {
    console.error("Update meeting error:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

// Delete/cancel a meeting (host only)
export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Check if user is the host
    if (meeting.host_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the host can delete this meeting" });
    }

    await Meeting.findByIdAndDelete(id);

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Delete meeting error:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

// Get available participants (all users except current user)
export const getAvailableParticipants = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      is_active: true
    }).select("first_name last_name email user_type");

    const participants = users.map(user => ({
      _id: user._id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      email: user.email,
      user_type: user.user_type
    }));

    res.json({ participants });
  } catch (error) {
    console.error("Get participants error:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
};
