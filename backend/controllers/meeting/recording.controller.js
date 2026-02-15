import Meeting from "../../models/Meeting.js";
import MeetingRecording from "../../models/MeetingRecording.js";
import { cloudinary } from "../../config/cloudinary.js";

/**
 * Upload a single meeting recording (video/audio/screen) to Cloudinary and save metadata.
 * Only meeting host can upload. Body (multipart): participant_id, participant_name, type (video|audio|screen), started_at, ended_at.
 */
export const uploadRecording = async (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const userId = String(req.userId);

    const meeting = await Meeting.findById(meetingId).lean();
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (String(meeting.host_id) !== userId) {
      return res.status(403).json({ error: "Only the host can upload meeting recordings" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No recording file provided" });
    }

    const {
      participant_id,
      participant_name,
      type,
      started_at,
      ended_at,
    } = req.body;

    if (!participant_id || !type || !started_at || !ended_at) {
      return res.status(400).json({
        error: "participant_id, type, started_at, ended_at are required",
      });
    }
    const validTypes = ["video", "audio", "screen"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "type must be video, audio, or screen" });
    }

    const started = new Date(started_at);
    const ended = new Date(ended_at);
    const durationSeconds = Math.max(0, Math.round((ended - started) / 1000));

    const publicId = `meeting-recordings/${meetingId}/${type}-${participant_id}-${Date.now()}.webm`;

    // Use "raw" so Cloudinary stores the file as-is; MediaRecorder WebM codecs can be rejected as "video"
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "meeting-recordings",
          public_id: publicId,
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const recording = new MeetingRecording({
      meeting_id: meetingId,
      participant_id: participant_id,
      participant_name: participant_name || null,
      type,
      cloudinary_url: result.secure_url,
      cloudinary_public_id: result.public_id,
      started_at: started,
      ended_at: ended,
      duration_seconds: durationSeconds,
    });
    await recording.save();

    return res.status(201).json({
      data: {
        _id: recording._id,
        meeting_id: recording.meeting_id,
        participant_id: recording.participant_id,
        participant_name: recording.participant_name,
        type: recording.type,
        cloudinary_url: recording.cloudinary_url,
        started_at: recording.started_at,
        ended_at: recording.ended_at,
        duration_seconds: recording.duration_seconds,
      },
    });
  } catch (error) {
    console.error("[MEETING_RECORDING] upload error:", error);
    return res.status(500).json({
      error: error.message || "Failed to upload recording",
    });
  }
};

/**
 * List all recordings for a meeting. Only participants (including host) can list.
 */
export const listRecordings = async (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const userId = String(req.userId);

    const meeting = await Meeting.findById(meetingId).lean();
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const isParticipant =
      String(meeting.host_id) === userId ||
      (Array.isArray(meeting.participants) &&
        meeting.participants.some((p) => String(p) === userId));

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not allowed to view these recordings" });
    }

    const recordings = await MeetingRecording.find({ meeting_id: meetingId })
      .sort({ started_at: 1 })
      .lean();

    return res.json({ data: recordings });
  } catch (error) {
    console.error("[MEETING_RECORDING] list error:", error);
    return res.status(500).json({ error: "Failed to fetch recordings" });
  }
};
