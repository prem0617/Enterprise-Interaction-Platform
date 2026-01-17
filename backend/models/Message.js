import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    channel_id: {
      type: Schema.Types.ObjectId,
      ref: "ChatChannel",
      required: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    message_type: {
      type: String,
      enum: ["text", "file", "system"],
      default: "text",
    },
    parent_message_id: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    edited_at: {
      type: Date,
    },
    deleted_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

// Indexes
messageSchema.index({ channel_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ parent_message_id: 1 });

export const Message = model("Message", messageSchema);
