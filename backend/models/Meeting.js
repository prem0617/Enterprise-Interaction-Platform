import { Schema, model } from "mongoose";

const meetingSchema = new Schema(
  {
    meeting_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    host_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    meeting_type: {
      type: String,
      enum: ["internal", "customer_consultation", "support"],
      required: true,
    },
    scheduled_at: {
      type: Date,
    },
    started_at: {
      type: Date,
    },
    ended_at: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended", "cancelled"],
      default: "scheduled",
    },
    recording_enabled: {
      type: Boolean,
      default: false,
    },
    country_restriction: {
      type: String,
      enum: ["germany", "india", "usa"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
meetingSchema.index({ meeting_code: 1 });
meetingSchema.index({ host_id: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ scheduled_at: 1 });

export default model("Meeting", meetingSchema);
