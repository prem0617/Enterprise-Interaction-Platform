import mongoose from "mongoose";

const COMPANY_PREFIX = process.env.COMPANY_CODE || "EIP";

const employeeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    emp_code: {
      type: String,
      unique: true,
      sparse: true,
    },
    employee_type: {
      type: String,
      enum: ["customer_support", "internal_team"],
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    position: {
      type: String,
      enum: [
        "ceo",
        "cto",
        "project_manager",
        "team_lead",
        "senior_engineer",
        "engineer",
        "junior_engineer",
        "intern",
      ],
      required: function () {
        return this.employee_type === "internal_team";
      },
    },
    team_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: function () {
        return (
          this.employee_type === "internal_team" &&
          this.position &&
          ["senior_engineer", "engineer", "junior_engineer", "intern"].includes(
            this.position
          )
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

// Auto-generate emp_code before save
employeeSchema.pre("save", async function () {
  if (this.emp_code) return;
  const Employee = mongoose.model("Employee");
  const last = await Employee.findOne({ emp_code: { $regex: `^${COMPANY_PREFIX}-` } })
    .sort({ emp_code: -1 })
    .select("emp_code")
    .lean();
  let nextNum = 1;
  if (last?.emp_code) {
    const parts = last.emp_code.split("-");
    nextNum = parseInt(parts[1], 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  this.emp_code = `${COMPANY_PREFIX}-${String(nextNum).padStart(4, "0")}`;
});

// Static: find by emp_code
employeeSchema.statics.findByEmpCode = function (code) {
  return this.findOne({ emp_code: code.toUpperCase() });
};

// Indexes
employeeSchema.index({ user_id: 1 });
employeeSchema.index({ emp_code: 1 }, { unique: true, sparse: true });
employeeSchema.index({ department: 1 });
employeeSchema.index({ employee_type: 1 });
employeeSchema.index({ team_lead_id: 1 });

export default mongoose.model("Employee", employeeSchema);
