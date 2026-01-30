import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending"
  },
  joined_at: Date
});

const whiteboardSessionSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      default: "Untitled Whiteboard"
    },
    host_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    participants: [participantSchema],
    canvas_data: {
      type: String, // JSON string of canvas state
      default: null
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
whiteboardSessionSchema.index({ host_id: 1 });
whiteboardSessionSchema.index({ "participants.user_id": 1 });
whiteboardSessionSchema.index({ createdAt: -1 });

export default mongoose.model("WhiteboardSession", whiteboardSessionSchema);
