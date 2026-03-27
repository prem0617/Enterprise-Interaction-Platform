import { Schema, model } from "mongoose";

const whiteboardSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Whiteboard",
    },
    session_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Serialised drawing elements array
    elements: {
      type: Schema.Types.Mixed,
      default: [],
    },
    // Canvas state (background color, zoom, etc.)
    canvas_state: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    is_public: {
      type: Boolean,
      default: true,
    },
    last_edited_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    version_counter: {
      type: Number,
      default: 0,
    },
    versions: [
      {
        version_number: {
          type: Number,
          required: true,
        },
        version_label: {
          type: String,
          required: true,
        },
        created_by: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        elements_snapshot: {
          type: Schema.Types.Mixed,
          default: [],
        },
        canvas_state_snapshot: {
          type: Schema.Types.Mixed,
          default: {},
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

whiteboardSchema.index({ owner_id: 1 });
whiteboardSchema.index({ collaborators: 1 });
whiteboardSchema.index({ status: 1 });

export default model("Whiteboard", whiteboardSchema);
