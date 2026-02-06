import { Schema, model } from "mongoose";

const chatChannelSchema = new Schema(
  {
    channel_type: {
      type: String,
      enum: ["direct", "group", "support", "team"],
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    country_restriction: {
      type: String,
      enum: ["germany", "india", "usa"],
      default: null,
    },
    ticket_id: {
      type: Schema.Types.ObjectId,
      ref: "SupportTicket",
    },
    department: {
      type: String,
      trim: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    last_message: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    last_message_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
chatChannelSchema.index({ channel_type: 1 });
chatChannelSchema.index({ ticket_id: 1 });
chatChannelSchema.index({ created_by: 1 });
chatChannelSchema.index({ country_restriction: 1 });

export const ChatChannel = model("ChatChannel", chatChannelSchema);
