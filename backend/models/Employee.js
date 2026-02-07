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
      enum: [
        "frontend",
        "backend",
        "devops",
        "qa",
        "hr",
        "finance",
        "customer_support",
      ],
      required: function () {
        // Department is required for internal_team with specific positions
        // For customer_support, we'll use "customer_support" as default
        return true;
      },
    },
    position: {
      type: String,
      enum: ["ceo", "cto", "team_lead", "senior", "mid", "junior"],
      required: function () {
        // Position is only required for internal_team
        return this.employee_type === "internal_team";
      },
    },
    team_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: function () {
        // Team lead is only required for specific positions
        return (
          this.employee_type === "internal_team" &&
          this.position &&
          ["senior", "mid", "junior"].includes(this.position)
        );
      },
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

// Pre-save middleware to set default department for customer_support
// Pre-save middleware to set default department for customer_support
employeeSchema.pre("save", async function () {
  if (this.employee_type === "customer_support" && !this.department) {
    this.department = "customer_support";
  }
});

export default mongoose.model("Employee", employeeSchema);
