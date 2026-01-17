import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    employee_type: {
      type: String,
      enum: ["customer_support", "internal_team"],
      required: true,
    },
    department: {
      type: String,
      enum: ["frontend", "backend", "devops", "qa", "hr", "finance"],
      required: true,
    },
    position: {
      type: String,
      enum: ["ceo", "cto", "team_lead", "senior", "mid", "junior"],
    },
    team_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    hire_date: {
      type: Date,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
employeeSchema.index({ user_id: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ employee_type: 1 });
employeeSchema.index({ team_lead_id: 1 });

export default mongoose.model("Employee", employeeSchema);
