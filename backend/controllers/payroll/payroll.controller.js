import mongoose from "mongoose";
import Payroll from "../../models/Payroll.js";
import Employee from "../../models/Employee.js";

// Admin: Create / update payroll record
export const upsertPayroll = async (req, res) => {
  try {
    const { employee_id, user_id, base_salary, currency, pay_frequency, bonus, allowances, deductions, tax, pay_period_start, pay_period_end, pay_date, status, bank_name, account_number, notes } = req.body;
    if (!employee_id || !user_id || !base_salary || !pay_period_start || !pay_period_end) {
      return res.status(400).json({ error: "employee_id, user_id, base_salary, pay_period_start, pay_period_end are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(employee_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Invalid employee_id or user_id" });
    }

    const existing = await Payroll.findOne({ employee_id, pay_period_start: new Date(pay_period_start) });
    if (existing) {
      Object.assign(existing, { base_salary, currency, pay_frequency, bonus, allowances, deductions, tax, pay_period_end: new Date(pay_period_end), pay_date: pay_date ? new Date(pay_date) : existing.pay_date, status: status || existing.status, bank_name, account_number, notes, processed_by: req.userId });
      await existing.save();
      return res.json({ success: true, payroll: existing });
    }

    const payroll = new Payroll({ employee_id, user_id, base_salary, currency, pay_frequency, bonus: bonus || 0, allowances: allowances || 0, deductions: deductions || 0, tax: tax || 0, pay_period_start: new Date(pay_period_start), pay_period_end: new Date(pay_period_end), pay_date: pay_date ? new Date(pay_date) : null, status: status || "draft", bank_name, account_number, notes, processed_by: req.userId });
    await payroll.save();
    res.status(201).json({ success: true, payroll });
  } catch (error) {
    console.error("Upsert payroll error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all payroll records (with filters)
export const getAllPayroll = async (req, res) => {
  try {
    const { month, year, status, department } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.pay_period_start = { $gte: start, $lte: end };
    }

    let records = await Payroll.find(filter)
      .populate({ path: "employee_id", populate: { path: "department", select: "name code" } })
      .populate("user_id", "first_name last_name email profile_picture country")
      .populate("processed_by", "first_name last_name")
      .sort({ pay_period_start: -1 });

    if (department) {
      records = records.filter((r) => r.employee_id?.department?._id?.toString() === department || r.employee_id?.department?.name === department);
    }

    const totals = records.reduce((acc, r) => ({ total_base: acc.total_base + r.base_salary, total_bonus: acc.total_bonus + r.bonus, total_net: acc.total_net + r.net_pay, count: acc.count + 1 }), { total_base: 0, total_bonus: 0, total_net: 0, count: 0 });

    res.json({ records, totals });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
};

// Admin: Process payroll (change status)
export const processPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "processed", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const payroll = await Payroll.findByIdAndUpdate(id, { status, processed_by: req.userId, ...(status === "paid" ? { pay_date: new Date() } : {}) }, { new: true });
    if (!payroll) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ error: "Failed to process payroll" });
  }
};

// Admin: Delete payroll record
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findById(id);
    if (!payroll) return res.status(404).json({ error: "Not found" });
    if (payroll.status === "paid") return res.status(400).json({ error: "Cannot delete a paid record" });
    await Payroll.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete" });
  }
};

// Admin: Get employees for payroll dropdown
export const getEmployeesForPayroll = async (req, res) => {
  try {
    const employees = await Employee.find({ is_active: true })
      .populate("user_id", "first_name last_name email")
      .populate("department", "name")
      .lean();
    res.json({ employees: employees.map((e) => ({ _id: e._id, user_id: e.user_id?._id, first_name: e.user_id?.first_name, last_name: e.user_id?.last_name, email: e.user_id?.email, department: e.department?.name, position: e.position })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

// Employee: Get my payroll history
export const getMyPayroll = async (req, res) => {
  try {
    const records = await Payroll.find({ user_id: req.userId, status: { $in: ["processed", "paid"] } })
      .sort({ pay_period_start: -1 })
      .limit(24);
    const totalEarned = records.reduce((sum, r) => sum + r.net_pay, 0);
    res.json({ records, total_earned: totalEarned });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
};

// Admin: Get payroll summary stats
export const getPayrollStats = async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [totalEmployees, thisMonthPayroll, pendingCount, paidCount] = await Promise.all([
      Employee.countDocuments({ is_active: true }),
      Payroll.find({ pay_period_start: { $gte: thisMonthStart, $lte: thisMonthEnd } }),
      Payroll.countDocuments({ status: "draft" }),
      Payroll.countDocuments({ status: "paid", pay_period_start: { $gte: thisMonthStart } }),
    ]);

    const totalPayroll = thisMonthPayroll.reduce((s, r) => s + r.net_pay, 0);
    const avgSalary = thisMonthPayroll.length > 0 ? Math.round(totalPayroll / thisMonthPayroll.length) : 0;

    res.json({ totalEmployees, totalPayroll, avgSalary, pendingCount, paidCount, processedThisMonth: thisMonthPayroll.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
