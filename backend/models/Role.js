import { Schema, model } from "mongoose";

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "admin",
        "hr",
        "ceo",
        "cto",
        "team_lead",
        "developer",
        "support_agent",
        "customer",
      ],
    },
    permissions: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
roleSchema.index({ name: 1 });

export default model("Role", roleSchema);
