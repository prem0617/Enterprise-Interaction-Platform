import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    check_in: {
      type: Date,
      default: null,
    },
    check_out: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "late", "on_leave", "holiday", "weekend"],
      default: "present",
    },
    work_type: {
      type: String,
      enum: ["office", "wfh", "hybrid"],
      default: "office",
    },
    total_hours: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    marked_by: {
      type: String,
      enum: ["self", "admin"],
      default: "self",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound index: one attendance record per user per day
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
