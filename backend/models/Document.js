import mongoose from "mongoose";

const CollaboratorSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    access:   { type: String, enum: ["read", "write"], default: "read" },
    added_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    title:   { type: String, default: "Untitled document" },
    content: { type: String, default: "" },
    owner:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Each entry: { user: ObjectId, access: "read"|"write", added_at: Date }
    collaborators: [CollaboratorSchema],

    is_public:  { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

DocumentSchema.pre("save", function () {
  this.updated_at = Date.now();
});

DocumentSchema.index({ owner: 1 });
DocumentSchema.index({ "collaborators.user": 1 });

const Document = mongoose.model("Document", DocumentSchema);
export default Document;