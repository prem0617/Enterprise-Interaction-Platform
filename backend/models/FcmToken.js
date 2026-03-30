import mongoose from "mongoose";

const fcmTokenSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true },
    user_agent: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

fcmTokenSchema.index({ user_id: 1, token: 1 });

export default mongoose.model("FcmToken", fcmTokenSchema);

