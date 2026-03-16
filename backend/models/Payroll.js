import { Schema, model } from "mongoose";

const payrollSchema = new Schema(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Compensation
    base_salary: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    pay_frequency: { type: String, enum: ["monthly", "bi-weekly", "weekly"], default: "monthly" },
    // Components
    bonus: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    net_pay: { type: Number, default: 0 },
    // Pay period
    pay_period_start: { type: Date, required: true },
    pay_period_end: { type: Date, required: true },
    pay_date: { type: Date },
    status: { type: String, enum: ["draft", "processed", "paid", "cancelled"], default: "draft" },
    // Bank
    bank_name: { type: String, default: "" },
    account_number: { type: String, default: "" },
    // Notes
    notes: { type: String, default: "" },
    processed_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

payrollSchema.index({ employee_id: 1, pay_period_start: 1 });
payrollSchema.index({ user_id: 1 });
payrollSchema.index({ status: 1 });

// Auto-calculate net_pay before save
payrollSchema.pre("save", function () {
  this.net_pay = this.base_salary + this.bonus + this.allowances - this.deductions - this.tax;
});

const Payroll = model("Payroll", payrollSchema);
export default Payroll;
