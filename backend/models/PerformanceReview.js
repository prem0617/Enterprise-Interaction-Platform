import { Schema, model } from "mongoose";

const goalSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  weight: { type: Number, default: 1 },
  self_rating: { type: Number, min: 1, max: 5, default: null },
  manager_rating: { type: Number, min: 1, max: 5, default: null },
  self_comment: { type: String, default: "" },
  manager_comment: { type: String, default: "" },
}, { _id: true });

const performanceReviewSchema = new Schema(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewer_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    // Review cycle
    cycle_name: { type: String, required: true },
    review_type: { type: String, enum: ["quarterly", "annual", "probation", "ad_hoc"], default: "quarterly" },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    // Status
    status: {
      type: String,
      enum: ["pending", "self_review", "manager_review", "completed", "cancelled"],
      default: "pending",
    },
    // Goals & ratings
    goals: [goalSchema],
    // Overall
    overall_self_rating: { type: Number, min: 1, max: 5, default: null },
    overall_manager_rating: { type: Number, min: 1, max: 5, default: null },
    self_summary: { type: String, default: "" },
    manager_summary: { type: String, default: "" },
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    // Dates
    submitted_at: { type: Date, default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

performanceReviewSchema.index({ user_id: 1, period_start: -1 });
performanceReviewSchema.index({ employee_id: 1 });
performanceReviewSchema.index({ status: 1 });

const PerformanceReview = model("PerformanceReview", performanceReviewSchema);
export default PerformanceReview;
