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
    file_url: {
      type: String,
    },
    file_name: {
      type: String,
    },
    file_type: {
      type: String,
    },
    file_size: {
      type: Number,
    },
    cloudinary_public_id: {
      type: String,
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
    // New field for tracking who has seen the message
    seen_by: [
      {
        user_id: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        seen_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

// Indexes
messageSchema.index({ channel_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ parent_message_id: 1 });
messageSchema.index({ "seen_by.user_id": 1 }); // New index for seen_by queries

// Virtual to check if all members have seen the message (for group chats)
messageSchema.virtual("is_seen_by_all").get(function () {
  return this.seen_by && this.seen_by.length > 0;
});

export const Message = model("Message", messageSchema);
