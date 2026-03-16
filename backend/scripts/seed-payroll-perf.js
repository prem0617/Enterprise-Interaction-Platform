import "../env.js";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import PerformanceReview from "../models/PerformanceReview.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/enterprise_platform";
const SALARIES = { ceo: 15000, cto: 13000, project_manager: 10000, team_lead: 9000, senior_engineer: 8000, engineer: 6500, junior_engineer: 5000, intern: 3000 };

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const now = new Date();
  const employees = await Employee.find({ is_active: true });

  // Payroll for current month
  let payrollCount = 0;
  for (const emp of employees) {
    const base = SALARIES[emp.position] || 6000;
    const existing = await Payroll.findOne({ employee_id: emp._id, pay_period_start: new Date(now.getFullYear(), now.getMonth(), 1) });
    if (existing) continue;

    const bonus = emp.position === "ceo" ? 2000 : emp.position?.includes("lead") ? 500 : Math.random() > 0.7 ? 300 : 0;
    const allowances = Math.round(base * 0.1);
    const tax = Math.round(base * 0.2);
    const deductions = Math.round(base * 0.05);

    await Payroll.create({
      employee_id: emp._id, user_id: emp.user_id,
      base_salary: base, currency: "USD", pay_frequency: "monthly",
      bonus, allowances, deductions, tax,
      pay_period_start: new Date(now.getFullYear(), now.getMonth(), 1),
      pay_period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      pay_date: new Date(now.getFullYear(), now.getMonth(), 28),
      status: Math.random() > 0.3 ? "paid" : "processed",
    });
    payrollCount++;
  }
  console.log(`✓ Created ${payrollCount} payroll records`);

  // Performance reviews — Q1 2026
  let reviewCount = 0;
  const goals = [
    { title: "Code Quality", description: "Maintain high code quality with thorough reviews", weight: 2 },
    { title: "Team Collaboration", description: "Actively participate in team discussions and pair programming", weight: 1 },
    { title: "Project Delivery", description: "Deliver assigned tasks on time", weight: 2 },
    { title: "Professional Growth", description: "Complete at least one certification or training", weight: 1 },
  ];

  for (const emp of employees) {
    const existing = await PerformanceReview.findOne({ employee_id: emp._id, cycle_name: "Q1 2026 Review" });
    if (existing) continue;

    const status = ["pending", "self_review", "manager_review", "completed"][Math.floor(Math.random() * 4)];
    const selfRating = status !== "pending" ? Math.floor(Math.random() * 2) + 3 : null;
    const mgrRating = status === "completed" ? Math.floor(Math.random() * 2) + 3 : null;

    await PerformanceReview.create({
      employee_id: emp._id, user_id: emp.user_id, reviewer_id: employees[0].user_id,
      cycle_name: "Q1 2026 Review", review_type: "quarterly",
      period_start: new Date(2026, 0, 1), period_end: new Date(2026, 2, 31),
      status,
      goals: goals.map((g) => ({
        ...g,
        self_rating: selfRating ? Math.floor(Math.random() * 2) + 3 : null,
        manager_rating: mgrRating ? Math.floor(Math.random() * 2) + 3 : null,
        self_comment: selfRating ? "Progressing well on this goal." : "",
        manager_comment: mgrRating ? "Good progress, keep it up." : "",
      })),
      overall_self_rating: selfRating,
      overall_manager_rating: mgrRating,
      self_summary: selfRating ? "I have made good progress this quarter across my assigned goals." : "",
      manager_summary: mgrRating ? "Solid performance this quarter. Demonstrated strong technical skills." : "",
      strengths: mgrRating ? ["Technical expertise", "Team collaboration"] : [],
      improvements: mgrRating ? ["Time management", "Documentation"] : [],
      submitted_at: ["manager_review", "completed"].includes(status) ? new Date() : null,
      reviewed_at: status === "completed" ? new Date() : null,
    });
    reviewCount++;
  }
  console.log(`✓ Created ${reviewCount} performance reviews`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
