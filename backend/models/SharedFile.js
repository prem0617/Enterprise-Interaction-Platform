import { Schema, model } from "mongoose";

const sharedFileSchema = new Schema(
  {
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    file_type: { type: String, default: "" },
    file_size: { type: Number, default: 0 },
    cloudinary_public_id: { type: String, default: "" },
    description: { type: String, default: "" },
    // Visibility
    visibility: {
      type: String,
      enum: ["everyone", "specific", "department", "admins_only"],
      default: "everyone",
    },
    // For "specific" visibility — list of user IDs who can access
    shared_with: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // For "department" visibility
    shared_department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    // Metadata
    download_count: { type: Number, default: 0 },
    category: { type: String, default: "general" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

sharedFileSchema.index({ uploaded_by: 1 });
sharedFileSchema.index({ visibility: 1 });
sharedFileSchema.index({ shared_with: 1 });
sharedFileSchema.index({ shared_department: 1 });

const SharedFile = model("SharedFile", sharedFileSchema);
export default SharedFile;
