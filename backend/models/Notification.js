import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "message",
        "mention",
        "channel_invite",
        "channel_removed",
        "role_change",
        "meeting_created",
        "meeting_reminder",
        "meeting_cancelled",
        "meeting_started",
        "call_missed",
        "leave_approved",
        "leave_rejected",
        "leave_requested",
        "ticket_message",
        "ticket_assigned",
        "employee_added",
        "attendance_late",
        "group_call",
        "system",
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: "",
    },
    // Metadata for linking to the relevant resource
    reference: {
      kind: {
        type: String,
        enum: [
          "message",
          "channel",
          "meeting",
          "ticket",
          "leave",
          "employee",
          "attendance",
          "call",
          null,
        ],
        default: null,
      },
      id: { type: Schema.Types.ObjectId, default: null },
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
    actor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

notificationSchema.index({ recipient_id: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, is_read: 1 });

const Notification = model("Notification", notificationSchema);
export default Notification;
