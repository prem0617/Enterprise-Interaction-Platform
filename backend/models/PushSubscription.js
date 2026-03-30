import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true },
    keys_p256dh: { type: String, required: true },
    keys_auth: { type: String, required: true },
    user_agent: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

pushSubscriptionSchema.index({ user_id: 1, endpoint: 1 });

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
